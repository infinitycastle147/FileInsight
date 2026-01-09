import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { FileDocument, GroundingMetadata } from '../types';
import { SYSTEM_PROMPT_TEMPLATE } from '../constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

// Track the active store internally
let activeStoreName: string | null = null;

/** Throw if API key missing. */
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key missing.");
  return key;
};

/** Single AI client factory. */
const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

/** Extract HTTP status if present. */
const getErrorStatus = (err: any): number => {
  if (!err) return 0;
  if (typeof err.status === "number") return err.status;
  if (typeof err.code === "number") return err.code;
  if (err.error && typeof err.error.code === "number") return err.error.code;
  if (err.error && typeof err.error.status === "number") return err.error.status;
  return 0;
};

/** Retry helper for transient errors. */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = getErrorStatus(error);
    const isTransient = status === 429 || status >= 500;
    if (retries > 0 && isTransient) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
      await new Promise(res => setTimeout(res, delay));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Ensures a valid FileSearchStore exists.
 * Verifies existence if we have a cached name, creates new if missing/invalid.
 */
async function getOrCreateStore(): Promise<string> {
  const ai = getAiClient();
  
  if (activeStoreName) {
    try {
      // Verify it still exists
      await ai.fileSearchStores.get({ name: activeStoreName });
      return activeStoreName;
    } catch (e) {
      console.warn("Cached store not found, creating new one.", e);
      activeStoreName = null;
    }
  }

  try {
    const store = await withRetry(() => ai.fileSearchStores.create({
      config: { displayName: `InsightStore_${Date.now()}` }
    }));
    activeStoreName = store.name || "";
    return activeStoreName;
  } catch (e) {
    console.error("Failed to create store", e);
    throw e;
  }
}

/**
 * Waits for a file to reach 'ACTIVE' state.
 */
async function waitForFileActive(fileUri: string) {
  const ai = getAiClient();
  let retries = 0;
  const maxRetries = 60; // 2 minutes approx

  while (retries < maxRetries) {
    try {
      const file = await ai.files.get({ name: fileUri });
      if (file.state === 'ACTIVE') return file;
      if (file.state === 'FAILED') throw new Error("File processing failed on server.");
    } catch (e: any) {
      if (getErrorStatus(e) !== 404) throw e;
      // If 404, file might not be visible yet, continue waiting
    }
    
    await new Promise(res => setTimeout(res, 2000));
    retries++;
  }
  throw new Error("File processing timed out.");
}

/**
 * Upload file to Gemini Files API, then import into the active FileSearchStore.
 */
export async function uploadFileToGemini(
  fileDoc: FileDocument
): Promise<FileDocument> {
  if (!fileDoc.fileHandle) throw new Error("File content missing.");

  const ai = getAiClient();

  try {
    // 1. Upload to Files API
    const uploadResponse = await withRetry(() => ai.files.upload({
      file: fileDoc.fileHandle!,
      config: { 
        displayName: fileDoc.name,
        mimeType: fileDoc.mimeType 
      }
    }));
    
    // uploadResponse is the File object itself in the new SDK
    const fileUri = uploadResponse.name;
    if (!fileUri) throw new Error("Upload failed: No URI returned.");

    // 2. Wait for ACTIVE state
    await waitForFileActive(fileUri);

    // 3. Ensure Store Exists
    const storeName = await getOrCreateStore();

    // 4. Add to Store
    // Use createFile to add a single file to the store (importFiles is not available or correct here)
    await withRetry(() => ai.fileSearchStores.createFile({
      parent: storeName,
      file: { name: fileUri }
    }));

    // Note: importFiles starts an operation, but for single files it's often quick.
    // However, strictly we should monitor the store/file status.
    // But since the file is ACTIVE, it's usually ready for search shortly.
    
    return { 
      ...fileDoc, 
      status: "active", 
      uploadUri: fileUri,
      error: undefined 
    };

  } catch (e: any) {
    const status = getErrorStatus(e);
    let msg = e.message;
    if (status === 403) msg = "Permission denied. Check API key.";
    return { ...fileDoc, status: "error", error: msg };
  }
}

/**
 * Delete a file from Gemini.
 */
export async function deleteFileFromGemini(uri: string) {
  const ai = getAiClient();
  try {
    await withRetry(() => ai.files.delete({ name: uri }));
  } catch (e) {
    console.warn("Failed to delete file from Gemini:", e);
  }
}

let currentChat: Chat | null = null;

/**
 * Initialize chat with File Search tool bound to a given store.
 * If no storeName is provided, uses the active store.
 */
export async function initializeChatSession(
  storeName?: string,
  modelId = "gemini-3-pro-preview"
) {
  const ai = getAiClient();
  
  // Resolve the store name
  let targetStore = storeName;
  if (!targetStore) {
    targetStore = await getOrCreateStore();
  }

  // Create chat session
  // We wrap this in a try/catch to handle 404s specifically by resetting the store
  try {
    currentChat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_PROMPT_TEMPLATE,
        tools: [
          {
            fileSearch: { fileSearchStoreNames: [targetStore] }
          }
        ]
      }
    });
    return currentChat;
  } catch (e: any) {
    const status = getErrorStatus(e);
    if (status === 404 && !storeName) {
      // If we used the cached activeStoreName and it failed, reset and try once more
      console.warn("Chat init failed with 404, resetting store and retrying.");
      activeStoreName = null;
      targetStore = await getOrCreateStore();
      currentChat = ai.chats.create({
        model: modelId,
        config: {
          systemInstruction: SYSTEM_PROMPT_TEMPLATE,
          tools: [{ fileSearch: { fileSearchStoreNames: [targetStore] } }]
        }
      });
      return currentChat;
    }
    throw e;
  }
}

/**
 * Send message stream with optional grounding metadata.
 */
export async function sendMessageStream(
  message: string,
  onChunk: (text: string, metadata?: GroundingMetadata) => void
): Promise<string> {
  if (!currentChat) {
    await initializeChatSession();
  }

  try {
    const result = await withRetry(() => currentChat!.sendMessageStream({ message }));
    let fullText = "";

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      const text = c.text || "";
      const meta = c.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
      fullText += text;
      onChunk(text, meta);
    }
    return fullText;
  } catch (err: any) {
    const status = getErrorStatus(err);
    if (status === 404) {
      // If session not found or store not found during message
      currentChat = null;
      // Force store check on next init
      activeStoreName = null; 
      throw new Error("Session context expired. Please try sending your message again.");
    }
    throw err;
  }
}

/**
 * Optional: Delete an existing File Search store permanently.
 */
export async function deleteFileSearchStore(storeName: string) {
  const ai = getAiClient();
  await withRetry(() => ai.fileSearchStores.delete({
    name: storeName,
    config: { force: true }
  }));
}