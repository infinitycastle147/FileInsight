import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Globe, ExternalLink, Sparkles } from 'lucide-react';
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
  
  // Filter for valid web citations to display in the footer
  const webCitations = groundingChunks.filter(chunk => chunk.web?.uri && chunk.web?.title);

  return (
    <div 
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn group`}
      role="log"
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
    >
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 md:gap-4`}>
        {/* Avatar */}
        <div 
          className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white z-10 ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' 
              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          }`}
          aria-hidden="true"
        >
          {isUser ? <User className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />}
        </div>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
           {/* Message Name/Time */}
           <div className={`flex items-center gap-2 mb-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-[11px] font-bold text-slate-700">{isUser ? 'You' : 'Gemini'}</span>
              <span className="text-[10px] font-medium text-slate-400">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
           </div>

          {/* Bubble */}
          <div className={`relative px-5 py-4 md:px-6 md:py-5 rounded-3xl text-sm md:text-[15px] leading-relaxed shadow-sm transition-all ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm shadow-indigo-500/20 shadow-md' 
              : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
          }`}>
            {isUser ? (
              <div className="whitespace-pre-wrap font-medium tracking-wide">{message.text}</div>
            ) : (
              <>
                <MarkdownErrorBoundary 
                  fallbackText="Structural error detected in model response format. Showing raw output."
                >
                  <div className="prose prose-sm prose-slate max-w-none dark:prose-invert font-normal">
                    <ReactMarkdown 
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-slate-900 mb-4 mt-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-800 mb-3 mt-6 border-b border-slate-100 pb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-800 mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 text-slate-600 leading-7" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 mb-4 space-y-1 text-slate-600" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 mb-4 space-y-1 text-slate-600" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                        code({node, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '')
                          return match ? (
                            <div className="relative group/code my-4">
                              <div className="absolute -inset-2 bg-slate-50 rounded-xl -z-10 border border-slate-200/50 opacity-50"></div>
                              <div className="bg-[#1e293b] rounded-xl overflow-hidden shadow-lg border border-slate-700/50">
                                <div className="flex items-center justify-between px-4 py-2 bg-[#0f172a] border-b border-slate-700/50">
                                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{match[1]}</span>
                                  <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                  </div>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                  <code className={`${className} !bg-transparent text-[13px] font-mono leading-relaxed text-slate-50`} {...props}>
                                    {children}
                                  </code>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded-md font-mono text-[12px] border border-slate-200/60 font-medium" {...props}>
                              {children}
                            </code>
                          )
                        },
                        table({children}) {
                          return (
                            <div className="overflow-hidden my-6 border border-slate-200 rounded-xl shadow-sm bg-white">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                  {children}
                                </table>
                              </div>
                            </div>
                          )
                        },
                        thead({children}) {
                          return <thead className="bg-slate-50 text-slate-700 font-semibold">{children}</thead>
                        },
                        th({children}) {
                          return <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{children}</th>
                        },
                        td({children}) {
                          return <td className="px-4 py-3 text-slate-600 border-t border-slate-100">{children}</td>
                        },
                        blockquote({children}) {
                          return <blockquote className="border-l-4 border-indigo-200 pl-4 py-1 my-4 italic text-slate-500 bg-slate-50/50 rounded-r-lg">{children}</blockquote>
                        }
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                </MarkdownErrorBoundary>

                {webCitations.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100/80">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-3 flex items-center gap-2 tracking-widest">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Verified Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {webCitations.map((chunk, idx) => (
                        <a 
                          key={`${chunk.web?.uri}-${idx}`} 
                          href={chunk.web?.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 group/link max-w-full"
                        >
                          <Globe className="w-3 h-3 text-slate-400 group-hover/link:text-indigo-500" />
                          <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[150px] sm:max-w-[200px] group-hover/link:text-indigo-700">{chunk.web?.title || "External Source"}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Actions */}
          <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'flex-row-reverse px-2' : 'px-2'}`}>
            {!isUser && (
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};