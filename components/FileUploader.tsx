import React, { useCallback, useState } from 'react';
import { UploadCloud, FilePlus } from 'lucide-react';
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

  const onDragOver = useCallback((e: React.DragEvent) => {
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
      className={`relative group overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ease-out cursor-pointer
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50 scale-[1.01] shadow-lg' 
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50 hover:shadow-sm'
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
        className="flex flex-col items-center justify-center p-8 w-full h-full cursor-pointer z-10 relative"
      >
        <div className={`p-3 rounded-full mb-3 transition-all duration-300 shadow-sm ${
          isDragging 
            ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' 
            : 'bg-white text-indigo-600 border border-slate-100 group-hover:scale-110 group-hover:border-indigo-100 group-hover:text-indigo-700'
        }`}>
          {isDragging ? <FilePlus className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
        </div>
        <div className="space-y-1 text-center">
          <h3 className={`text-sm font-semibold transition-colors ${isDragging ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-800'}`}>
            {isDragging ? 'Drop to Upload' : 'Click or Drag Documents'}
          </h3>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            Up to 25MB per file
          </p>
        </div>
      </label>
    </div>
  );
};