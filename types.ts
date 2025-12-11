/**
 * Type definitions for FileInsight application
 * 
 * This file contains all TypeScript interfaces and enums used
 * throughout the application for type safety and documentation.
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Possible states for a file during the upload/processing lifecycle.
 */
export type FileStatus = 'pending' | 'uploading' | 'processing' | 'active' | 'error';

/**
 * Application page/view identifiers.
 */
export type AppPage = 'chat' | 'stores';

// =============================================================================
// FILE TYPES
// =============================================================================

/**
 * Represents a document uploaded to the system.
 * Contains both local preview data and Gemini API metadata.
 */
export interface FileDocument {
  /** Unique identifier for the file (UUID) */
  id: string;

  /** Original filename with extension */
  name: string;

  /** Text content for local preview (if readable) */
  content: string;

  /** Native browser File object for API upload */
  fileHandle?: File;

  /** MIME type of the file (e.g., 'text/plain') */
  mimeType: string;

  /** File extension including leading dot (e.g., '.txt') */
  type: string;

  /** File size in bytes */
  size: number;

  /** Timestamp when file was added (Date.now()) */
  uploadDate: number;

  /** Gemini API file resource name after upload */
  uploadUri?: string;

  /** Current status in the upload/processing pipeline */
  status: FileStatus;

  /** Error message if status is 'error' */
  error?: string;
}

// =============================================================================
// CHAT MESSAGE TYPES
// =============================================================================

/**
 * Enum representing the sender of a chat message.
 */
export enum MessageRole {
  /** Message sent by the user */
  USER = 'user',
  /** Response from the AI model */
  MODEL = 'model',
  /** System notification message */
  SYSTEM = 'system'
}

/**
 * Represents a single message in the chat conversation.
 */
export interface ChatMessage {
  /** Unique identifier for the message (UUID) */
  id: string;

  /** Who sent this message */
  role: MessageRole;

  /** The message content (supports Markdown) */
  text: string;

  /** Timestamp when message was created (Date.now()) */
  timestamp: number;

  /** Whether the message is currently being streamed */
  isStreaming?: boolean;

  /** Grounding metadata from Gemini (sources, citations) */
  groundingMetadata?: GroundingMetadata;
}

// =============================================================================
// GROUNDING METADATA TYPES (Gemini API)
// =============================================================================

/**
 * Web source reference from Gemini's web grounding.
 */
export interface WebSource {
  /** URL of the web page */
  uri: string;
  /** Title of the web page */
  title: string;
}

/**
 * Retrieved context from file search.
 */
export interface RetrievedContext {
  /** URI/name of the retrieved file */
  uri: string;
  /** Optional title or display name */
  title?: string;
}

/**
 * A single grounding chunk (source reference).
 */
export interface GroundingChunk {
  /** Web source if grounded from web search */
  web?: WebSource;
  /** File source if grounded from uploaded documents */
  retrievedContext?: RetrievedContext;
}

/**
 * A segment of text that has grounding support.
 */
export interface GroundingSupport {
  /** The text segment that is supported */
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  /** Indices into groundingChunks array */
  groundingChunkIndices?: number[];
  /** Confidence scores for each grounding chunk */
  confidenceScores?: number[];
}

/**
 * Complete grounding metadata from Gemini API response.
 * Contains information about sources used to generate the response.
 */
export interface GroundingMetadata {
  /** Array of source references */
  groundingChunks?: GroundingChunk[];

  /** Mapping of response segments to their sources */
  groundingSupports?: GroundingSupport[];

  /** Metadata about retrieval operations */
  retrievalMetadata?: {
    googleSearchDynamicRetrievalScore?: number;
  };

  /** Search queries used for web grounding */
  webSearchQueries?: string[];
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

/**
 * State for tracking async processing operations.
 */
export interface ProcessingStatus {
  /** Whether an operation is in progress */
  isProcessing: boolean;
  /** Description of current task (for UI feedback) */
  currentTask?: string;
}

/**
 * Parsed source information for display in the UI.
 */
export interface ParsedSource {
  /** The original grounding chunk data */
  chunk: GroundingChunk;
  /** Human-readable display name */
  displayName: string;
  /** Type of source for styling */
  type: 'web' | 'file' | 'other';
}