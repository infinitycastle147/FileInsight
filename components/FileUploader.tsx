/**
 * FileUploader Component
 * 
 * Provides a drag-and-drop and click-to-upload interface for files.
 * Validates file types and sizes before processing.
 */

import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from '../constants';
import { FileDocument } from '../types';
import {
  getFileExtension,
  getMimeType,
  isTextBasedMimeType,
  readFileAsText,
  generateId
} from '../utils';

// =============================================================================
// TYPES
// =============================================================================

interface FileUploaderProps {
  /** Callback when files are successfully processed */
  onFilesAdded: (files: FileDocument[]) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * File upload component with drag-and-drop support.
 * 
 * Features:
 * - Drag and drop file upload
 * - Click to browse files
 * - File type validation
 * - File size validation
 * - Text preview extraction for supported types
 * 
 * @param props - Component props
 * 
 * @example
 * <FileUploader onFilesAdded={(files) => console.log(files)} />
 */
export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded }) => {

  /**
   * Processes a FileList and creates FileDocument objects.
   */
  const handleFiles = async (fileList: FileList | null): Promise<void> => {
    if (!fileList || fileList.length === 0) return;

    const newFiles: FileDocument[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const processedFile = await processFile(file);

      if (processedFile) {
        newFiles.push(processedFile);
      }
    }

    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
    }
  };

  /**
   * Processes a single File and returns a FileDocument or null if invalid.
   */
  const processFile = async (file: File): Promise<FileDocument | null> => {
    const extension = getFileExtension(file.name);
    const extWithDot = extension ? `.${extension}` : '';

    // Validate file type
    if (!SUPPORTED_EXTENSIONS.includes(extWithDot)) {
      showValidationError(`File type ${extWithDot || 'unknown'} not supported`, file.name);
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showValidationError('File is too large (>5MB)', file.name);
      return null;
    }

    try {
      const mimeType = getMimeType(extension);
      const content = await extractPreviewContent(file, mimeType);

      return {
        id: generateId(),
        name: file.name,
        content,
        fileHandle: file,
        mimeType,
        type: extWithDot,
        size: file.size,
        uploadDate: Date.now(),
        status: 'pending'
      };
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      return null;
    }
  };

  /**
   * Extracts preview content from a file if it's text-based.
   */
  const extractPreviewContent = async (file: File, mimeType: string): Promise<string> => {
    if (isTextBasedMimeType(mimeType)) {
      return await readFileAsText(file);
    }

    const extension = getFileExtension(file.name).toUpperCase();
    return `[Preview not available for ${extension} files]`;
  };

  /**
   * Shows a validation error alert.
   */
  const showValidationError = (message: string, fileName: string): void => {
    alert(`${message}. Skipping ${fileName}`);
  };

  /**
   * Handles file drop events.
   */
  const onDrop = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, []);

  /**
   * Handles drag over events to allow dropping.
   */
  const onDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handles file input change events.
   */
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    handleFiles(e.target.files);
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-slate-50/80 transition-all duration-300 cursor-pointer group relative overflow-hidden bg-white"
    >
      <input
        type="file"
        multiple
        className="hidden"
        id="fileInput"
        onChange={onInputChange}
        accept={SUPPORTED_EXTENSIONS.join(',')}
      />

      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center relative z-10">
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-sm">
          <UploadCloud className="w-8 h-8 text-indigo-500" />
        </div>

        <h3 className="text-[15px] font-semibold text-slate-700 mb-1 group-hover:text-indigo-600 transition-colors">
          Click to upload or drag and drop
        </h3>

        <p className="text-xs text-slate-400 font-medium max-w-[200px] leading-relaxed">
          Supported: Text, Markdown, Code, PDF (max 5MB)
        </p>
      </label>

      {/* Decorative gradient blob */}
      <div
        className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};