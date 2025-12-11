/**
 * File utility functions for FileInsight
 * 
 * Contains helper functions for file processing, validation,
 * and formatting.
 */

import { MIME_TYPE_MAP } from '../constants';

/**
 * Extracts the file extension from a filename.
 * 
 * @param fileName - The full filename including extension
 * @returns The extension without the leading dot, lowercase
 * 
 * @example
 * getFileExtension('document.PDF') // returns 'pdf'
 * getFileExtension('file') // returns ''
 */
export const getFileExtension = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() ?? '' : '';
};

/**
 * Gets the MIME type for a given file extension.
 * 
 * @param extension - File extension without leading dot
 * @returns The corresponding MIME type, defaults to 'text/plain'
 * 
 * @example
 * getMimeType('json') // returns 'application/json'
 * getMimeType('unknown') // returns 'text/plain'
 */
export const getMimeType = (extension: string): string => {
    return MIME_TYPE_MAP[extension] ?? 'text/plain';
};

/**
 * Formats a file size in bytes to a human-readable string.
 * 
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "1.5 KB" or "2.3 MB"
 * 
 * @example
 * formatFileSize(1536) // returns "1.5 KB"
 * formatFileSize(1048576) // returns "1.0 MB"
 */
export const formatFileSize = (bytes: number, decimals: number = 1): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Checks if a MIME type represents a text-based file.
 * Used to determine if file content can be previewed.
 * 
 * @param mimeType - The MIME type to check
 * @returns True if the file content can be read as text
 * 
 * @example
 * isTextBasedMimeType('text/plain') // returns true
 * isTextBasedMimeType('application/pdf') // returns false
 */
export const isTextBasedMimeType = (mimeType: string): boolean => {
    return (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType.includes('sql') ||
        mimeType.includes('xml')
    );
};

/**
 * Reads a File object as text content.
 * 
 * @param file - Browser File object to read
 * @returns Promise resolving to the file's text content
 * @throws Error if file reading fails
 * 
 * @example
 * const content = await readFileAsText(file);
 */
export const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error(`Failed to read file: ${e}`));
        reader.readAsText(file);
    });
};

/**
 * Generates a unique identifier using crypto.randomUUID.
 * Falls back to a simple implementation if crypto is unavailable.
 * 
 * @returns A UUID v4 string
 */
export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Truncates a filename to a maximum length, preserving the extension.
 * 
 * @param fileName - The filename to truncate
 * @param maxLength - Maximum total length (default: 30)
 * @returns Truncated filename with ellipsis if needed
 * 
 * @example
 * truncateFileName('very-long-document-name.pdf', 20) // returns "very-long-doc...pdf"
 */
export const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (fileName.length <= maxLength) return fileName;

    const ext = getFileExtension(fileName);
    const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
    const availableLength = maxLength - ext.length - 4; // 4 for "..." and "."

    if (availableLength <= 0) return fileName.slice(0, maxLength - 3) + '...';

    return `${nameWithoutExt.slice(0, availableLength)}...${ext}`;
};
