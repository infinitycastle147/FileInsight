export interface FileDocument {
  id: string;
  name: string;
  content: string; // Text content for preview (if available)
  base64?: string; // Base64 encoded content (optional now, as we use fileHandle)
  fileHandle?: File; // Native browser File object for upload
  mimeType: string;
  type: string; // Extension
  size: number;
  uploadDate: number;
  
  // File Search specific fields
  uploadUri?: string;
  status?: 'pending' | 'uploading' | 'processing' | 'active' | 'error';
  error?: string;
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  webSearchQueries?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  groundingMetadata?: GroundingMetadata;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  currentTask?: string;
}