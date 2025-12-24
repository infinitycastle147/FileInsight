import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Globe, ExternalLink } from 'lucide-react';
import { ChatMessage, MessageRole } from '../types';
import { MarkdownErrorBoundary } from './MarkdownErrorBoundary';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groundingChunks = message.groundingMetadata?.groundingChunks || [];

  return (
    <div 
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
      role="log"
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
    >
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
        <div 
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ring-2 ring-white ${
            isUser ? 'bg-indigo-600' : 'bg-slate-800'
          }`}
          aria-hidden="true"
        >
          {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
        </div>

        <div className="flex flex-col gap-1.5 min-w-0">
          <div className={`relative px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none hover:border-slate-300'
          }`}>
            {isUser ? (
              <div className="whitespace-pre-wrap font-medium">{message.text}</div>
            ) : (
              <>
                <MarkdownErrorBoundary 
                  fallbackText="Structural error detected in model response format. Showing raw output."
                >
                  <div className="prose prose-sm prose-slate max-w-none dark:prose-invert font-medium">
                    <ReactMarkdown 
                      components={{
                        code({node, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '')
                          return match ? (
                            <div className="bg-slate-900 rounded-xl p-4 my-4 overflow-x-auto text-slate-100 text-[11px] font-mono leading-relaxed border border-white/10 shadow-lg">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </div>
                          ) : (
                            <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-[11px] border border-slate-200 font-bold" {...props}>
                              {children}
                            </code>
                          )
                        },
                        table({children}) {
                          return (
                            <div className="overflow-x-auto my-4 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                              <table className="min-w-full divide-y divide-slate-200 text-xs">
                                {children}
                              </table>
                            </div>
                          )
                        }
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                </MarkdownErrorBoundary>

                {groundingChunks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-3 flex items-center gap-2 tracking-widest">
                      <Globe className="w-3.5 h-3.5" />
                      Verification Citations
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groundingChunks.map((chunk, idx) => {
                        if (!chunk.web) return null;
                        return (
                          <a 
                            key={`${chunk.web.uri}-${idx}`} 
                            href={chunk.web.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm border border-slate-100 hover:border-indigo-200 transition-all group/link"
                          >
                            <span className="text-[10px] font-bold text-slate-600 truncate pr-2 uppercase tracking-tight">{chunk.web.title || "External Source"}</span>
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover/link:text-indigo-500" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className={`flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse px-2' : 'px-2'}`}>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {!isUser && (
              <button 
                onClick={handleCopy}
                className="p-1 text-slate-300 hover:text-indigo-500 transition-colors focus-visible:opacity-100"
                title="Copy response"
                aria-label="Copy response to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};