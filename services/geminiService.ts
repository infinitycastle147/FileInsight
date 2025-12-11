/**
 * Gemini AI Service
 * 
 * Provides integration with Google's Gemini AI API for:
 * - File upload and processing
 * - Chat session management
 * - File search store operations
 * 
 * @module services/geminiService
 */

import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { FileDocument, GroundingMetadata } from '../types';
import { DEFAULT_MODEL_ID, SYSTEM_INSTRUCTION, FILE_PROCESSING_POLL_INTERVAL } from '../constants';

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

/**
 * In-memory storage for the user's API key.
 * This is intentionally not persisted for security.
 */
let userApiKey: string | null = null;

/**
 * Sets the API key provided by the user.
 * Resets any existing sessions when the key changes.
 * 
 * @param apiKey - The Google AI API key
 * 
 * @example
 * setApiKey('AIza...');
 */
export const setApiKey = (apiKey: string): void => {
  userApiKey = apiKey;
  // Reset sessions to use new key
  currentChatSession = null;
  fileSearchStorePromise = null;
};

/**
 * Checks if an API key has been set.
 * 
 * @returns True if a valid API key is present
 */
export const hasApiKey = (): boolean => {
  return userApiKey !== null && userApiKey.length > 0;
};

/**
 * Clears the API key and resets all sessions.
 * Use for logout/reset functionality.
 */
export const clearApiKey = (): void => {
  userApiKey = null;
  currentChatSession = null;
  fileSearchStorePromise = null;
};

/**
 * Retrieves the current API key.
 * 
 * @throws Error if no API key is set
 * @returns The current API key
 */
const getApiKey = (): string => {
  if (!userApiKey) {
    throw new Error("API Key not set. Please provide your Google AI API key.");
  }
  return userApiKey;
};

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Current active chat session */
let currentChatSession: Chat | null = null;

/** Promise for file search store creation (prevents race conditions) */
let fileSearchStorePromise: Promise<any> | null = null;

/**
 * Creates a new GoogleGenAI client instance.
 * 
 * @returns Configured GoogleGenAI client
 */
const getAiClient = (): GoogleGenAI => new GoogleGenAI({ apiKey: getApiKey() });

// =============================================================================
// FILE SEARCH STORE OPERATIONS
// =============================================================================

/**
 * Creates a File Search Store if one doesn't exist for this session.
 * Uses a promise pattern to prevent race conditions during multiple file uploads.
 * 
 * @returns Promise resolving to the file search store
 * @throws Error if store creation fails
 */
const ensureFileSearchStore = (): Promise<any> => {
  // Return existing promise if store creation is in progress
  if (fileSearchStorePromise) {
    return fileSearchStorePromise;
  }

  fileSearchStorePromise = (async () => {
    const ai = getAiClient();
    const storeName = `FileInsight Store ${new Date().toLocaleTimeString()}`;

    console.log("[FileSearchStore] Creating new store...");

    try {
      const store = await ai.fileSearchStores.create({
        config: { displayName: storeName }
      });

      console.log(`[FileSearchStore] Created: ${store.name}`);
      return store;
    } catch (error) {
      console.error("[FileSearchStore] Creation failed:", error);
      // Reset promise on failure to allow retry
      fileSearchStorePromise = null;
      throw error;
    }
  })();

  return fileSearchStorePromise;
};

/**
 * Lists all file search stores for the current API key.
 * 
 * @returns Async iterable of file stores
 * 
 * @example
 * const stores = await listFileStores();
 * for await (const store of stores) {
 *   console.log(store.name);
 * }
 */
export const listFileStores = async (): Promise<AsyncIterable<any>> => {
  const ai = getAiClient();
  return ai.fileSearchStores.list();
};

/**
 * Deletes a file search store by name.
 * 
 * @param storeName - The full resource name of the store
 * 
 * @example
 * await deleteFileStore('fileSearchStores/abc123');
 */
export const deleteFileStore = async (storeName: string): Promise<void> => {
  const ai = getAiClient();
  await ai.fileSearchStores.delete({
    name: storeName,
    config: { force: true }
  });
  console.log(`[FileSearchStore] Deleted: ${storeName}`);
};

// =============================================================================
// FILE UPLOAD OPERATIONS
// =============================================================================

/**
 * Uploads a file to Gemini and adds it to the active file search store.
 * 
 * Process:
 * 1. Ensure a file search store exists
 * 2. Upload file to Gemini Media API
 * 3. Import file to the store for indexing
 * 4. Poll until processing is complete
 * 
 * @param fileDoc - The file document to upload
 * @returns Updated file document with status and URI
 * @throws Error if fileHandle is missing
 * 
 * @example
 * const updatedFile = await uploadFileToGemini(fileDoc);
 * if (updatedFile.status === 'active') {
 *   console.log('File ready for search');
 * }
 */
export const uploadFileToGemini = async (fileDoc: FileDocument): Promise<FileDocument> => {
  if (!fileDoc.fileHandle) {
    throw new Error("No file handle found for upload");
  }

  const ai = getAiClient();
  const fileSearchStoresClient = ai.fileSearchStores as any;

  try {
    // Step 1: Ensure store exists
    const store = await ensureFileSearchStore();

    // Step 2: Upload file to Media API
    console.log(`[Upload] Step 1: Uploading ${fileDoc.name}...`);

    const uploadResult = await ai.files.upload({
      file: fileDoc.fileHandle,
      config: {
        displayName: fileDoc.name,
        mimeType: fileDoc.mimeType
      }
    });

    if (!uploadResult?.name) {
      throw new Error("Upload failed: No resource name returned");
    }

    console.log(`[Upload] Step 2: File uploaded: ${uploadResult.name}`);

    // Step 3: Import file to store
    console.log(`[Upload] Step 3: Importing to store ${store.name}...`);

    let operation = await fileSearchStoresClient.importFile({
      fileSearchStoreName: store.name,
      fileName: uploadResult.name
    });

    // Step 4: Poll until done
    console.log(`[Upload] Step 4: Polling for completion...`);

    while (!operation.done) {
      await delay(FILE_PROCESSING_POLL_INTERVAL);
      operation = await ai.operations.get({ operation });
    }

    console.log(`[Upload] Success: ${fileDoc.name} is active`);

    return {
      ...fileDoc,
      uploadUri: uploadResult.name,
      status: 'active'
    };

  } catch (error: any) {
    console.error(`[Upload] Error for ${fileDoc.name}:`, error);

    // Log additional context for debugging
    if (error.message?.includes('importFile')) {
      console.warn("[Upload] importFile method may not be available in SDK version");
    }

    return {
      ...fileDoc,
      status: 'error',
      error: error.message || "Upload failed"
    };
  }
};

// =============================================================================
// CHAT SESSION OPERATIONS
// =============================================================================

/**
 * Initializes or re-initializes a chat session with the current file search store.
 * 
 * @param modelId - The Gemini model to use (default: gemini-2.5-flash)
 * @returns The initialized chat session
 * 
 * @example
 * const session = await initializeChatSession();
 */
export const initializeChatSession = async (
  modelId: string = DEFAULT_MODEL_ID
): Promise<Chat> => {
  const ai = getAiClient();
  const store = await ensureFileSearchStore();

  console.log(`[Chat] Initializing session with store: ${store.name}`);

  currentChatSession = ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [store.name]
          }
        }
      ],
    },
  });

  return currentChatSession;
};

/**
 * Callbacks for streaming message responses.
 */
export type StreamCallback = (
  text: string,
  metadata?: GroundingMetadata
) => void;

/**
 * Sends a message to the chat session and streams the response.
 * 
 * @param message - The user's message
 * @param onChunk - Callback invoked for each response chunk
 * @returns The complete response text
 * @throws Error if chat session is not initialized
 * 
 * @example
 * const response = await sendMessageStream(
 *   "What is in my documents?",
 *   (chunk, metadata) => {
 *     console.log(chunk);
 *     if (metadata) console.log('Sources:', metadata);
 *   }
 * );
 */
export const sendMessageStream = async (
  message: string,
  onChunk: StreamCallback
): Promise<string> => {
  try {
    // Auto-initialize if needed
    if (!currentChatSession) {
      await initializeChatSession();
    }

    if (!currentChatSession) {
      throw new Error("Chat session not initialized");
    }

    console.log(`[Chat] Sending message: "${message.substring(0, 50)}..."`);

    const result = await currentChatSession.sendMessageStream({ message });
    let fullText = '';

    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      const text = response.text;
      const metadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;

      if (text || metadata) {
        if (text) {
          fullText += text;
        }
        onChunk(text || '', metadata);
      }
    }

    console.log(`[Chat] Response complete (${fullText.length} chars)`);
    return fullText;

  } catch (error) {
    console.error("[Chat] Error sending message:", error);
    throw error;
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Delays execution for the specified milliseconds.
 * 
 * @param ms - Milliseconds to wait
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
