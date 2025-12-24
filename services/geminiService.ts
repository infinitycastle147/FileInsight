
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { FileDocument, GroundingMetadata } from '../types';
import { SYSTEM_PROMPT_TEMPLATE } from '../constants';

const STORE_NAME_KEY = 'gemini_file_insight_store_name';
const MAX_INDEXING_WAIT_TIME = 120000; // 2 minutes timeout for indexing
const RETRY_DELAY_BASE = 1000;
const MAX_RETRIES = 3;

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please check your configuration.");
  }
  return key;
};

// Singleton references
let currentChatSession: Chat | null = null;
let activeStoreName: string | null = localStorage.getItem(STORE_NAME_KEY);

const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Utility for exponential backoff retries on transient errors.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.code;
    const isTransient = status === 429 || status >= 500;
    
    if (retries > 0 && isTransient) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
      console.warn(`Transient error detected (${status}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Ensures a FileSearchStore exists for this session.
 */
async function getOrCreateStore() {
  const ai = getAiClient();
  
  if (activeStoreName) return activeStoreName;

  try {
    // Cast to any to handle undocumented FileSearchStore API and avoid "unknown" property errors
    const store = await withRetry(() => (ai as any).fileSearchStores.create({
      config: { displayName: `InsightStore_${Date.now()}` }
    })) as any;
    activeStoreName = store.name;
    localStorage.setItem(STORE_NAME_KEY, store.name);
    return activeStoreName;
  } catch (error: any) {
    console.error("Error creating FileSearchStore:", error);
    throw new Error(`Knowledge base initialization failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Uploads a file to Gemini, then imports it into the FileSearchStore for RAG.
 */
export const uploadFileToGemini = async (fileDoc: FileDocument): Promise<FileDocument> => {
  const ai = getAiClient();
  
  if (!fileDoc.fileHandle) throw new Error("File content is missing.");

  try {
    // 1. Upload to Gemini Files API - cast to any as this part of the SDK is undocumented in snippet
    const uploadResponse = await withRetry(() => (ai as any).files.upload({
      file: fileDoc.fileHandle!,
      config: { 
        displayName: fileDoc.name,
        mimeType: fileDoc.mimeType 
      }
    })) as any;

    const storeName = await getOrCreateStore();

    // 2. Import file into the Search Store - cast operation to any to access status properties
    let operation = await withRetry(() => (ai as any).fileSearchStores.importFile({
      fileSearchStoreName: storeName,
      fileName: uploadResponse.name
    })) as any;

    // 3. Poll for completion of indexing with timeout protection
    const startTime = Date.now();
    while (!operation.done) {
      if (Date.now() - startTime > MAX_INDEXING_WAIT_TIME) {
        throw new Error("Indexing timed out. The file might still be processing on the server.");
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
      // polling operation also cast to any
      operation = await withRetry(() => (ai as any).operations.get({ operation })) as any;
    }

    if (operation.error) {
      throw new Error(`Indexing failed: ${operation.error.message || 'Cloud processing error'}`);
    }

    return {
      ...fileDoc,
      uploadUri: uploadResponse.name,
      status: 'active',
      error: undefined
    };
  } catch (error: any) {
    console.error("RAG Processing Error:", error);
    let errorMessage = "Processing failed.";
    
    if (error.message?.includes("timed out")) {
      errorMessage = "Indexing took too long. Check back in a moment.";
    } else if (error.status === 403) {
      errorMessage = "Permission denied. Check your API key permissions.";
    } else if (error.status === 400) {
      errorMessage = "Invalid file format or metadata.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { 
      ...fileDoc, 
      status: 'error', 
      error: errorMessage 
    };
  }
};

/**
 * Initializes a chat session configured with the native fileSearch tool.
 */
export const initializeChatSession = async (modelId: string = 'gemini-3-pro-preview') => {
  try {
    const ai = getAiClient();
    const storeName = await getOrCreateStore();

    currentChatSession = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_PROMPT_TEMPLATE,
        tools: [{ 
          fileSearch: { 
            fileSearchStoreNames: [storeName] 
          } 
        } as any],
      },
    });
    return currentChatSession;
  } catch (error: any) {
    console.error("Session init error:", error);
    throw new Error(`Failed to start AI session: ${error.message}`);
  }
};

export const deleteFileFromGemini = async (fileUri: string) => {
  const ai = getAiClient();
  try {
    await withRetry(() => (ai as any).files.delete({ name: fileUri }));
  } catch (e) {
    console.error("Cleanup error:", e);
  }
};

/**
 * Sends a message. The model will now automatically use the fileSearch tool.
 */
export const sendMessageStream = async (
  message: string, 
  onChunk: (text: string, metadata?: GroundingMetadata) => void
): Promise<string> => {
  if (!currentChatSession) {
    await initializeChatSession();
  }
  
  try {
    // Cast result to any to handle AsyncIterable type inference issues when wrapped in withRetry
    const result = await withRetry(() => currentChatSession!.sendMessageStream({ message })) as any;
    let fullText = '';
    
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      const text = c.text || '';
      const metadata = c.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
      
      fullText += text;
      onChunk(text, metadata);
    }

    return fullText;
  } catch (error: any) {
    console.error("Chat streaming error:", error);
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment before asking again.");
    }
    currentChatSession = null; // Clear session on failure to allow fresh retry
    throw error;
  }
};
