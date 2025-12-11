/**
 * FileIcon Component
 * 
 * Displays an appropriate icon based on the file extension.
 * Uses Lucide icons with consistent styling.
 */

import React from 'react';
import {
  FileText,
  FileJson,
  FileCode,
  FileType,
  FileSpreadsheet,
  File
} from 'lucide-react';
import { getFileExtension } from '../utils';

// =============================================================================
// TYPES
// =============================================================================

interface FileIconProps {
  /** The filename to determine the icon for */
  fileName: string;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// ICON CONFIGURATION
// =============================================================================

/**
 * Mapping of file extensions to their icon configurations.
 */
const ICON_CONFIG: Record<string, { Icon: typeof FileText; colorClass: string }> = {
  json: { Icon: FileJson, colorClass: 'text-yellow-600' },
  csv: { Icon: FileSpreadsheet, colorClass: 'text-green-600' },
  md: { Icon: FileText, colorClass: 'text-slate-500' },
  txt: { Icon: FileText, colorClass: 'text-slate-500' },
  pdf: { Icon: File, colorClass: 'text-red-500' },
  js: { Icon: FileCode, colorClass: 'text-blue-500' },
  ts: { Icon: FileCode, colorClass: 'text-blue-500' },
  tsx: { Icon: FileCode, colorClass: 'text-blue-500' },
  jsx: { Icon: FileCode, colorClass: 'text-blue-500' },
  py: { Icon: FileCode, colorClass: 'text-blue-500' },
  html: { Icon: FileCode, colorClass: 'text-blue-500' },
  css: { Icon: FileCode, colorClass: 'text-blue-500' },
};

/** Default icon configuration for unknown file types */
const DEFAULT_ICON_CONFIG = {
  Icon: FileType,
  colorClass: 'text-slate-400'
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders a file icon based on the file extension.
 * 
 * @param props - Component props
 * @returns The appropriate file icon component
 * 
 * @example
 * <FileIcon fileName="document.pdf" />
 * <FileIcon fileName="script.ts" className="w-6 h-6" />
 */
export const FileIcon: React.FC<FileIconProps> = ({
  fileName,
  className = "w-5 h-5"
}) => {
  const extension = getFileExtension(fileName);
  const { Icon, colorClass } = ICON_CONFIG[extension] ?? DEFAULT_ICON_CONFIG;

  return <Icon className={`${colorClass} ${className}`} />;
};