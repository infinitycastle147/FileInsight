export interface FileDocument {
  id: string;
  name: string;
  content?: string; // Content is now optional and loaded lazily
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