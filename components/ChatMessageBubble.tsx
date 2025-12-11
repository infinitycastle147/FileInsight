/**
 * ChatMessageBubble Component
 * 
 * Renders a single chat message with support for:
 * - User and AI message styling
 * - Markdown rendering
 * - Code syntax highlighting
 * - Grounding/source citations
 * - Copy functionality
 */

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Globe, ExternalLink, Sparkles, FileText } from 'lucide-react';
import { ChatMessage, MessageRole, FileDocument, ParsedSource, GroundingChunk } from '../types';

// =============================================================================
// TYPES
// =============================================================================

interface ChatMessageBubbleProps {
  /** The message to display */
  message: ChatMessage;
  /** List of uploaded files for source resolution */
  uploadedFiles?: FileDocument[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Resolves a file URI to a human-readable filename.
 * Attempts to match against uploaded files first.
 */
const resolveFileName = (uri: string, uploadedFiles: FileDocument[]): string => {
  // Try matching by uploadUri
  for (const file of uploadedFiles) {
    if (file.uploadUri && uri.includes(file.uploadUri)) {
      return file.name;
    }

    // Also try matching by file ID portion
    const uriParts = uri.split('/');
    const fileId = uriParts[uriParts.length - 1];
    if (file.uploadUri?.includes(fileId)) {
      return file.name;
    }
  }

  // Fallback: return last segment of URI
  const parts = uri.split('/');
  return parts[parts.length - 1] || 'Document';
};

/**
 * Parses domain from a URL for display.
 */
const parseDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'External Source';
  }
};

/**
 * Parses grounding chunks into unique, displayable sources.
 */
const parseGroundingSources = (
  chunks: GroundingChunk[] | undefined,
  uploadedFiles: FileDocument[]
): ParsedSource[] => {
  if (!chunks) return [];

  const seenNames = new Set<string>();
  const sources: ParsedSource[] = [];

  for (const chunk of chunks) {
    let displayName = '';
    let type: 'web' | 'file' | 'other' = 'other';

    if (chunk.web) {
      displayName = chunk.web.title || chunk.web.uri;
      type = 'web';
    } else if (chunk.retrievedContext) {
      displayName = resolveFileName(chunk.retrievedContext.uri || '', uploadedFiles);
      type = 'file';
    } else {
      // Fallback for unknown structure
      const anyKey = Object.keys(chunk)[0];
      if (anyKey) {
        const anyValue = (chunk as any)[anyKey];
        displayName = anyValue?.title || anyValue?.uri || anyValue?.displayName || 'Referenced Source';
      }
    }

    // Deduplicate by display name
    if (displayName && !seenNames.has(displayName)) {
      seenNames.add(displayName);
      sources.push({ chunk, displayName, type });
    }
  }

  return sources;
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Avatar component for message sender.
 */
const MessageAvatar: React.FC<{ isUser: boolean }> = ({ isUser }) => (
  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${isUser
      ? 'bg-gradient-to-br from-indigo-500 to-indigo-700'
      : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
    }`}>
    {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
  </div>
);

/**
 * Copy button that appears on hover for AI messages.
 */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-xs font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

/**
 * Web source card component.
 */
const WebSourceCard: React.FC<{ source: ParsedSource }> = ({ source }) => {
  if (!source.chunk.web) return null;

  const domain = parseDomain(source.chunk.web.uri);

  return (
    <a
      href={source.chunk.web.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-sm hover:bg-indigo-50/30 transition-all group/link relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[80%] group-hover/link:text-indigo-500 transition-colors">
          {domain}
        </span>
        <ExternalLink className="w-3 h-3 text-slate-300 group-hover/link:text-indigo-500 transition-colors flex-shrink-0" />
      </div>
      <span
        className="text-xs font-medium text-slate-700 leading-snug group-hover/link:text-indigo-900 transition-colors"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {source.displayName}
      </span>
    </a>
  );
};

/**
 * File source card component.
 */
const FileSourceCard: React.FC<{ source: ParsedSource }> = ({ source }) => (
  <div className="flex flex-col p-3 rounded-xl bg-indigo-50 border border-indigo-200 transition-all relative overflow-hidden">
    <div className="flex items-start justify-between gap-2 mb-1">
      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Uploaded File
      </span>
    </div>
    <span
      className="text-xs font-medium text-indigo-900 leading-snug"
      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
    >
      {source.displayName}
    </span>
  </div>
);

/**
 * Generic source card for unknown source types.
 */
const GenericSourceCard: React.FC<{ source: ParsedSource }> = ({ source }) => (
  <div className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-200 transition-all relative overflow-hidden">
    <div className="flex items-start justify-between gap-2 mb-1">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Source
      </span>
    </div>
    <span
      className="text-xs font-medium text-slate-700 leading-snug"
      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
    >
      {source.displayName}
    </span>
  </div>
);

/**
 * Sources section showing all grounding references.
 */
const SourcesSection: React.FC<{ sources: ParsedSource[] }> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-emerald-100 p-1 rounded">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Sources Referenced ({sources.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {sources.map((source, idx) => {
          switch (source.type) {
            case 'web':
              return <WebSourceCard key={idx} source={source} />;
            case 'file':
              return <FileSourceCard key={idx} source={source} />;
            default:
              return <GenericSourceCard key={idx} source={source} />;
          }
        })}
      </div>
    </div>
  );
};

// =============================================================================
// MARKDOWN COMPONENTS
// =============================================================================

/**
 * Custom Markdown component renderers for ReactMarkdown.
 */
const markdownComponents = {
  p: ({ children }: any) => <p className="mb-4 last:mb-0">{children}</p>,

  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');

    if (match) {
      // Code block with language
      return (
        <div className="rounded-lg overflow-hidden my-4 border border-slate-700/50 shadow-sm bg-[#1e293b]">
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f172a] border-b border-slate-700/50">
            <span className="text-xs font-mono text-slate-400">{match[1]}</span>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <code className={`${className} !bg-transparent text-sm font-mono`} {...props}>
              {children}
            </code>
          </div>
        </div>
      );
    }

    // Inline code
    return (
      <code
        className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-mono text-[13px] border border-slate-200/60 font-medium"
        {...props}
      >
        {children}
      </code>
    );
  },

  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
  h1: ({ children }: any) => <h1 className="text-xl font-bold mb-3 mt-4 text-slate-900">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold mb-3 mt-4 text-slate-900">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-base font-bold mb-2 mt-3 text-slate-900">{children}</h3>,

  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-emerald-500/30 pl-4 py-1 my-4 bg-emerald-50/30 rounded-r italic text-slate-600">
      {children}
    </blockquote>
  ),

  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
    >
      {children}
    </a>
  )
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Renders a chat message bubble with appropriate styling and features.
 * 
 * @param props - Component props
 * 
 * @example
 * <ChatMessageBubble message={msg} uploadedFiles={files} />
 */
export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  uploadedFiles = []
}) => {
  const isUser = message.role === MessageRole.USER;

  // Parse grounding sources with memoization
  const uniqueSources = useMemo(
    () => parseGroundingSources(message.groundingMetadata?.groundingChunks, uploadedFiles),
    [message.groundingMetadata, uploadedFiles]
  );

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 group`}>
      <div className={`flex max-w-[85%] md:max-w-[80%] lg:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>

        {/* Avatar */}
        <MessageAvatar isUser={isUser} />

        {/* Message Content */}
        <div className={`relative px-6 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all flex flex-col gap-3 ${isUser
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-md shadow-indigo-200'
            : 'bg-white border border-slate-100/80 text-slate-800 rounded-tl-md shadow-slate-100'
          }`}>

          {/* Decorative sparkle for AI messages */}
          {!isUser && (
            <div className="absolute -top-1 -left-1 opacity-10" aria-hidden="true">
              <Sparkles className="w-12 h-12 text-emerald-500 fill-current" />
            </div>
          )}

          {isUser ? (
            // User message - plain text
            <div className="whitespace-pre-wrap font-medium">{message.text}</div>
          ) : (
            // AI message - markdown with sources
            <div className="relative z-10">
              <div className="prose prose-slate max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                <ReactMarkdown components={markdownComponents}>
                  {message.text}
                </ReactMarkdown>
              </div>

              <SourcesSection sources={uniqueSources} />
            </div>
          )}

          {/* Copy button for AI messages */}
          {!isUser && (
            <div className="absolute -bottom-8 right-0 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
              <CopyButton text={message.text} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};