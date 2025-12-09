import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Globe, ExternalLink } from 'lucide-react';
import { ChatMessage, MessageRole } from '../types';

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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-600' : 'bg-emerald-600'} shadow-sm`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col gap-2 ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-sm' 
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.text}</div>
          ) : (
            <>
              <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                <ReactMarkdown 
                  components={{
                    code({node, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <div className="bg-slate-900 rounded-md p-2 my-2 overflow-x-auto text-slate-50 text-xs">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </div>
                      ) : (
                        <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs border border-slate-200" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>

              {/* Grounding Sources (Search Results) */}
              {groundingChunks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Sources
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {groundingChunks.map((chunk, idx) => {
                      if (!chunk.web) return null;
                      return (
                        <a 
                          key={idx} 
                          href={chunk.web.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all group/link"
                        >
                          <span className="text-xs font-medium text-slate-700 truncate pr-2">{chunk.web.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover/link:text-indigo-500" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Copy Button (Model only) */}
          {!isUser && (
            <button 
              onClick={handleCopy}
              className="absolute -bottom-6 right-0 p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};