import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE, MIME_TYPE_MAP } from '../constants';
import { FileDocument } from '../types';

interface FileUploaderProps {
  onFilesAdded: (files: FileDocument[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded }) => {
  const [isDragging, setIsDragging] = useState(false);

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
        alert(`File ${file.name} is too large (>25MB). Skipping.`);
        continue;
      }

      const mimeType = MIME_TYPE_MAP[extRaw || 'txt'] || 'text/plain';

      newFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        fileHandle: file,
        mimeType: mimeType,
        type: ext,
        size: file.size,
        uploadDate: Date.now(),
        status: 'pending'
      });
    }

    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = useCallback((e: React.DragOverEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <div 
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group relative ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] ring-4 ring-indigo-500/10' 
          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
      }`}
    >
      <input 
        type="file" 
        multiple 
        className="hidden" 
        id="fileInput"
        onChange={(e) => handleFiles(e.target.files)}
        accept={SUPPORTED_EXTENSIONS.join(',')}
      />
      <label 
        htmlFor="fileInput" 
        className="cursor-pointer flex flex-col items-center focus-within:ring-2 focus-within:ring-indigo-500 outline-none"
      >
        <div className={`p-2.5 rounded-xl mb-3 transition-all ${
          isDragging ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'
        }`}>
          <UploadCloud className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Upload Documents</h3>
        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">CSV, PDF, JSON, MD (MAX 25MB)</p>
      </label>
    </div>
  );
};