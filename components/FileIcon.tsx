import React from 'react';
import { FileText, FileJson, FileCode, FileType, FileSpreadsheet, File } from 'lucide-react';

interface FileIconProps {
  fileName: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ fileName, className = "w-5 h-5" }) => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return <FileJson className={`text-yellow-600 ${className}`} />;
    case 'csv':
      return <FileSpreadsheet className={`text-green-600 ${className}`} />;
    case 'md':
    case 'txt':
      return <FileText className={`text-slate-500 ${className}`} />;
    case 'pdf':
      return <File className={`text-red-500 ${className}`} />;
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'py':
    case 'html':
    case 'css':
      return <FileCode className={`text-blue-500 ${className}`} />;
    default:
      return <FileType className={`text-slate-400 ${className}`} />;
  }
};