/**
 * Application-wide constants for FileInsight
 * 
 * This file contains all configuration values, supported file types,
 * and system prompts used throughout the application.
 */

// =============================================================================
// FILE HANDLING CONFIGURATION
// =============================================================================

/**
 * List of supported file extensions for upload.
 * Each extension should include the leading dot.
 */
export const SUPPORTED_EXTENSIONS: readonly string[] = [
  '.txt', '.md', '.json', '.csv',
  '.js', '.jsx', '.ts', '.tsx', '.py',
  '.html', '.css', '.xml', '.sql',
  '.pdf'
] as const;

/**
 * Maximum file size in bytes (5MB).
 * Files larger than this will be rejected during upload.
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Mapping of file extensions to their corresponding MIME types.
 * Used when uploading files to the Gemini API.
 */
export const MIME_TYPE_MAP: Readonly<Record<string, string>> = {
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  js: 'text/javascript',
  jsx: 'text/javascript',
  ts: 'text/javascript',
  tsx: 'text/javascript',
  py: 'text/x-python',
  html: 'text/html',
  css: 'text/css',
  xml: 'text/xml',
  sql: 'application/x-sql',
  pdf: 'application/pdf'
} as const;

// =============================================================================
// AI MODEL CONFIGURATION
// =============================================================================

/**
 * Default Gemini model to use for chat sessions.
 */
export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

/**
 * System instruction for the AI assistant.
 * Defines the assistant's behavior and capabilities.
 */
export const SYSTEM_INSTRUCTION = `You are a helpful file analysis assistant. Use the fileSearch tool to find information in the uploaded documents. Always cite your sources.`;

/**
 * Legacy system prompt template (kept for reference).
 * @deprecated Use SYSTEM_INSTRUCTION instead
 */
export const SYSTEM_PROMPT_TEMPLATE = `
You are an advanced file analysis assistant named "FileInsight". 
Your goal is to answer user questions based strictly on the provided documents.

INSTRUCTIONS:
1.  Analyze the provided files carefully.
2.  Answer the user's questions based ONLY on these documents.
3.  If the answer is not in the documents, state that clearly.
4.  Cite the filename when referencing specific information.
5.  Format your response using clear Markdown.
`;

// =============================================================================
// UI CONFIGURATION
// =============================================================================

/**
 * Suggested questions shown to users when they have uploaded files
 * but haven't started a conversation yet.
 */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  "Summarize the documents",
  "Find the key dates",
  "What is the main topic?"
] as const;

/**
 * Polling interval (in milliseconds) for checking file processing status.
 */
export const FILE_PROCESSING_POLL_INTERVAL = 2000;

// Types are re-exported from types.ts for backwards compatibility
export type { FileStatus, AppPage } from './types';