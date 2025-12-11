/**
 * Custom hook for managing file uploads and file state
 * 
 * Extracts all file-related logic from the main App component
 * for better separation of concerns and reusability.
 */

import { useState, useCallback } from 'react';
import { FileDocument } from '../types';
import { uploadFileToGemini, initializeChatSession } from '../services/geminiService';

/**
 * Return type for the useFileManager hook.
 */
export interface UseFileManagerReturn {
    /** List of all uploaded files */
    files: FileDocument[];

    /** IDs of files currently being uploaded */
    uploadQueue: string[];

    /** ID of the currently selected/active file for preview */
    activeFileId: string | null;

    /** Whether any files are currently uploading */
    isUploading: boolean;

    /** Count of files that are successfully processed and active */
    activeCount: number;

    /** The currently active file object (if any) */
    activeFile: FileDocument | undefined;

    /** Add new files to the manager and start upload */
    addFiles: (newFiles: FileDocument[]) => Promise<void>;

    /** Remove a file by ID */
    removeFile: (id: string) => void;

    /** Set the active file for preview */
    setActiveFileId: (id: string | null) => void;
}

/**
 * Hook for managing file uploads and file state.
 * 
 * Handles:
 * - Adding files to state
 * - Uploading files to Gemini API
 * - Tracking upload progress
 * - Managing active file selection
 * - Removing files
 * 
 * @returns File management state and functions
 * 
 * @example
 * const { files, addFiles, removeFile, isUploading } = useFileManager();
 */
export const useFileManager = (): UseFileManagerReturn => {
    const [files, setFiles] = useState<FileDocument[]>([]);
    const [uploadQueue, setUploadQueue] = useState<string[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);

    /**
     * Updates a file's properties in the files array.
     */
    const updateFile = useCallback((id: string, updates: Partial<FileDocument>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }, []);

    /**
     * Processes a single file upload to Gemini.
     */
    const processFileUpload = async (fileDoc: FileDocument): Promise<void> => {
        updateFile(fileDoc.id, { status: 'uploading' });

        try {
            const updatedDoc = await uploadFileToGemini(fileDoc);
            updateFile(fileDoc.id, updatedDoc);

            if (updatedDoc.status === 'error') {
                console.error(`Failed to upload ${updatedDoc.name}: ${updatedDoc.error}`);
            }
        } catch (error) {
            console.error("Upload critical failure", error);
            updateFile(fileDoc.id, { status: 'error' });
        } finally {
            setUploadQueue(prev => prev.filter(id => id !== fileDoc.id));
        }
    };

    /**
     * Adds new files and starts the upload process.
     */
    const addFiles = useCallback(async (newFiles: FileDocument[]): Promise<void> => {
        if (newFiles.length === 0) return;

        // Add files to state immediately
        setFiles(prev => [...prev, ...newFiles]);

        // Add to upload queue
        const newIds = newFiles.map(f => f.id);
        setUploadQueue(prev => [...prev, ...newIds]);

        // Process uploads sequentially for store consistency
        for (const fileDoc of newFiles) {
            await processFileUpload(fileDoc);
        }

        // Re-initialize chat session after batch upload
        await initializeChatSession();
    }, []);

    /**
     * Removes a file from the manager.
     */
    const removeFile = useCallback((id: string): void => {
        setFiles(prev => prev.filter(f => f.id !== id));

        // Clear active file if it was removed
        if (activeFileId === id) {
            setActiveFileId(null);
        }

        // Note: In production, we should also delete from Gemini store
    }, [activeFileId]);

    // Computed values
    const isUploading = uploadQueue.length > 0;
    const activeCount = files.filter(f => f.status === 'active').length;
    const activeFile = files.find(f => f.id === activeFileId);

    return {
        files,
        uploadQueue,
        activeFileId,
        isUploading,
        activeCount,
        activeFile,
        addFiles,
        removeFile,
        setActiveFileId
    };
};
