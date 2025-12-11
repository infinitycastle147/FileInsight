import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Globe, ExternalLink, Sparkles } from 'lucide-react';
import { ChatMessage, MessageRole } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groundingChunks = message.groundingMetadata?.groundingChunks || [];

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 group`}>
      <div className={`flex max-w-[85%] md:max-w-[80%] lg:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>

        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${isUser
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-700'
          : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
          }`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`relative px-6 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all flex flex-col gap-3 ${isUser
          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-md shadow-indigo-200'
          : 'bg-white border border-slate-100/80 text-slate-800 rounded-tl-md shadow-slate-100'
          }`}>

          {/* Decorative Sparkle for Model */}
          {!isUser && (
            <div className="absolute -top-1 -left-1 opacity-10">
              <Sparkles className="w-12 h-12 text-emerald-500 fill-current" />
            </div>
          )}

          {isUser ? (
            <div className="whitespace-pre-wrap font-medium">{message.text}</div>
          ) : (
            <div className="relative z-10">
              <div className="prose prose-slate max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <div className="rounded-lg overflow-hidden my-4 border border-slate-700/50 shadow-sm bg-[#1e293b]">
                          <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f172a] border-b border-slate-700/50">
                            <span className="text-xs font-mono text-slate-400">{match[1]}</span>
                            <div className="flex gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
                            </div>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <code className={`${className} !bg-transparent text-sm font-mono`} {...props}>
                              {children}
                            </code>
                          </div>
                        </div>
                      ) : (
                        <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-mono text-[13px] border border-slate-200/60 font-medium" {...props}>
                          {children}
                        </code>
                      )
                    },
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 text-slate-900">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-4 text-slate-900">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 text-slate-900">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-500/30 pl-4 py-1 my-4 bg-emerald-50/30 rounded-r italic text-slate-600">{children}</blockquote>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium">{children}</a>
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>

              {/* Grounding Sources (Grid Layout) */}
              {groundingChunks.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-emerald-100 p-1 rounded">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sources Referenced
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {groundingChunks.map((chunk, idx) => {
                      if (!chunk.web) return null;
                      // Simple domain extraction
                      let domain = "External Source";
                      try {
                        const url = new URL(chunk.web.uri);
                        domain = url.hostname.replace('www.', '');
                      } catch (e) { }

                      return (
                        <a
                          key={idx}
                          href={chunk.web.uri}
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
                          <span className="text-xs font-medium text-slate-700 leading-snug group-hover/link:text-indigo-900 transition-colors" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {chunk.web.title}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Copy Button (Model only) */}
          {!isUser && (
            <div className={`absolute -bottom-8 right-0 transition-opacity duration-200 ${copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};