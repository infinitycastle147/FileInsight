import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE, MIME_TYPE_MAP } from '../constants';
import { FileDocument } from '../types';

interface FileUploaderProps {
  onFilesAdded: (files: FileDocument[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded }) => {
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: FileDocument[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const extRaw = file.name.split('.').pop()?.toLowerCase();
      const ext = extRaw ? `.${extRaw}` : '';
      
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        alert(`File type ${ext} not supported. Skipping ${file.name}`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large (>5MB). Skipping.`);
        continue;
      }

      try {
        const mimeType = MIME_TYPE_MAP[extRaw || 'txt'] || 'text/plain';
        let content = '';

        // We still read text for the local preview if possible, but strictly use fileHandle for API
        if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType.includes('sql') || mimeType.includes('xml')) {
           content = await readFileAsText(file);
        } else {
           content = `[Preview not available for ${ext.toUpperCase()} files]`;
        }

        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          content: content,
          fileHandle: file, // Store the native file object for Gemini API upload
          mimeType: mimeType,
          type: ext,
          size: file.size,
          uploadDate: Date.now(),
          status: 'pending'
        });
      } catch (e) {
        console.error("Error reading file", file.name, e);
      }
    }

    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div 
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer group"
    >
      <input 
        type="file" 
        multiple 
        className="hidden" 
        id="fileInput"
        onChange={(e) => handleFiles(e.target.files)}
        accept={SUPPORTED_EXTENSIONS.join(',')}
      />
      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
        <div className="p-3 bg-indigo-100 rounded-full mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-6 h-6 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</h3>
        <p className="text-xs text-slate-500 mt-1">Supported: Text, Code, PDF (Max 5MB)</p>
      </label>
    </div>
  );
};