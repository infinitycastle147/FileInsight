
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Menu, Trash2, Send, MessageSquare, X, Database, Search, 
  Loader2, Globe, AlertCircle, CheckCircle2, Eraser, Info
} from 'lucide-react';
import { FileDocument, ChatMessage, MessageRole } from './types';
import { FileUploader } from './components/FileUploader';
import { FileIcon } from './components/FileIcon';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { initializeChatSession, sendMessageStream, uploadFileToGemini, deleteFileFromGemini } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { activeCount, isSyncing, activeFile } = useMemo(() => ({
    activeCount: files.filter(f => f.status === 'active').length,
    isSyncing: files.some(f => f.status === 'uploading' || f.status === 'processing' || f.status === 'pending'),
    activeFile: files.find(f => f.id === activeFileId)
  }), [files, activeFileId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle local file preview (Client side only)
  useEffect(() => {
    if (activeFile && !activeFile.content && activeFile.fileHandle) {
      const mime = activeFile.mimeType;
      const isText = mime.startsWith('text/') || mime === 'application/json' || mime.includes('sql') || mime.includes('xml') || mime === 'text/markdown';
      
      if (isText) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: text } : f));
        };
        reader.readAsText(activeFile.fileHandle);
      } else {
        setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: `[Preview not available for ${activeFile.type.toUpperCase()} files. They have been indexed for RAG analysis.]` } : f));
      }
    }
  }, [activeFileId, activeFile]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const updateHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    };
    const rafId = requestAnimationFrame(updateHeight);
    return () => cancelAnimationFrame(rafId);
  }, [inputValue]);

  const handleAddFiles = useCallback(async (newFiles: FileDocument[]) => {
    // Set initial uploading status
    const uploadingFiles = newFiles.map(f => ({ ...f, status: 'uploading' as const }));
    setFiles(prev => [...prev, ...uploadingFiles]);
    
    // Process each file (Upload + Store Import)
    for (const fileDoc of newFiles) {
      try {
        const result = await uploadFileToGemini(fileDoc);
        setFiles(prev => prev.map(f => f.id === fileDoc.id ? result : f));
      } catch (e: any) {
        setFiles(prev => prev.map(f => f.id === fileDoc.id ? { 
          ...f, 
          status: 'error', 
          error: e.message || 'System failed to index this document.' 
        } : f));
      }
    }

    try {
      await initializeChatSession();
    } catch (e: any) {
       console.error("Session refresh failed after upload:", e);
    }
  }, []);

  const clearChat = () => {
    if (window.confirm("Clear all messages in this conversation?")) {
      setMessages([]);
      initializeChatSession().catch(console.error);
    }
  };

  const removeFile = useCallback(async (id: string) => {
    const fileToRemove = files.find(f => f.id === id);
    if (!fileToRemove) return;

    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
    setConfirmDeleteId(null);

    if (fileToRemove.uploadUri) {
      try {
        await deleteFileFromGemini(fileToRemove.uploadUri);
        await initializeChatSession();
      } catch (e) {
        console.error("Failed to clean up remote file", e);
      }
    }
  }, [files, activeFileId]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isProcessing) return;

    if (activeCount === 0) {
      alert("Please ensure at least one document is successfully indexed (marked with green check).");
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: MessageRole.USER,
      text: trimmedInput,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    const modelMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: modelMsgId,
      role: MessageRole.MODEL,
      text: '', 
      timestamp: Date.now(),
      isStreaming: true
    }]);

    try {
      await sendMessageStream(userMsg.text, (chunk, metadata) => {
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
            ? { ...msg, text: msg.text + chunk, groundingMetadata: metadata || msg.groundingMetadata } 
            : msg
        ));
      });
    } catch (error: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId ? { 
          ...msg, 
          text: `Error: ${error.message || "An unexpected error occurred during RAG analysis. Please try again."}`,
          isStreaming: false 
        } : msg
      ));
    } finally {
      setIsProcessing(false);
      setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, isStreaming: false } : msg));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside 
        aria-label="Knowledge Base"
        className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col relative flex-shrink-0 z-20`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight truncate">FileInsight</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-1.5 hover:bg-slate-100 rounded-md lg:hidden text-slate-500"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <section className="mb-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Source Materials</h2>
            <FileUploader onFilesAdded={handleAddFiles} />
          </section>

          <nav aria-label="Document List" className="space-y-2">
             {files.length === 0 && (
               <div className="text-center text-slate-400 py-10 px-4 text-xs italic">
                 No documents uploaded yet.
               </div>
             )}
             {files.map(file => (
               <div key={file.id} className="group relative">
                 <div 
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      activeFileId === file.id 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                    } ${file.status === 'error' ? 'border-red-100 bg-red-50/30' : ''}`}
                 >
                   <button 
                      onClick={() => setActiveFileId(file.id === activeFileId ? null : file.id)}
                      className="relative shrink-0 mt-0.5 focus:outline-none"
                    >
                      <FileIcon fileName={file.name} />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                        {file.status === 'active' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        {(file.status === 'uploading' || file.status === 'processing' || file.status === 'pending') && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                        {file.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      </div>
                   </button>
                   
                   <div className="flex flex-col min-w-0 flex-1">
                      <button 
                        onClick={() => setActiveFileId(file.id === activeFileId ? null : file.id)}
                        className={`text-sm font-semibold truncate text-left focus:outline-none ${activeFileId === file.id ? 'text-indigo-900' : 'text-slate-700'}`}
                      >
                        {file.name}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                        {file.status === 'error' && (
                          <span className="text-[9px] text-red-600 font-bold uppercase flex items-center gap-1 group/err relative cursor-help">
                            <Info className="w-2.5 h-2.5" />
                            Failed
                            <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-slate-900 text-white text-[10px] normal-case rounded-lg opacity-0 group-hover/err:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl">
                              {file.error || "Unknown indexing error"}
                            </span>
                          </span>
                        )}
                      </div>
                   </div>

                   {confirmDeleteId === file.id ? (
                     <div className="absolute inset-0 z-10 bg-white/95 rounded-xl flex items-center justify-center p-2 border border-red-200 shadow-sm">
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="text-[10px] font-bold text-red-600 px-2 py-1 hover:bg-red-50 rounded uppercase"
                        >
                          Delete
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] font-bold text-slate-400 px-2 py-1 hover:bg-slate-50 rounded uppercase ml-2"
                        >
                          Back
                        </button>
                     </div>
                   ) : (
                     <button 
                        onClick={() => setConfirmDeleteId(file.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label={`Remove ${file.name}`}
                      >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   )}
                 </div>
               </div>
             ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
             <Globe className="w-3 h-3" />
             <span>AI Grounding System</span>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                aria-label="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-bold text-slate-800 flex items-center gap-2 truncate">
              {activeFile ? (
                <>
                  <span className="text-slate-300 font-medium hidden sm:inline">Source:</span> 
                  <span className="text-indigo-600 truncate">{activeFile.name}</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="truncate">RAG Analysis Terminal</span>
                </>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button 
                onClick={clearChat}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Clear Chat"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${isSyncing ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                {isSyncing ? 'Syncing Store...' : `${activeCount} Indexed`}
              </span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
           {activeFile && (
              <section 
                aria-label="Document Preview"
                className="flex-1 bg-white overflow-auto border-r border-slate-200 p-8 max-w-2xl hidden lg:block animate-slideInRight"
              >
                 <div className="prose prose-slate prose-sm max-w-none">
                    <div className="relative">
                      <div className="absolute top-0 right-0 text-[10px] font-mono text-slate-300 uppercase tracking-widest pointer-events-none">
                        Content Preview
                      </div>
                      {activeFile.content ? (
                        <pre className="text-xs bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed shadow-inner">
                          {activeFile.content}
                        </pre>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 animate-pulse bg-slate-50 rounded-2xl border border-slate-100">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs font-medium uppercase tracking-widest">Loading Preview</span>
                        </div>
                      )}
                    </div>
                 </div>
              </section>
           )}

           <section 
             aria-label="Chat Conversation"
             className={`flex-1 flex flex-col bg-slate-50 relative transition-all duration-300 ${activeFile ? 'lg:max-w-[50%]' : ''}`}
           >
             <div className="flex-1 overflow-y-auto p-4 lg:p-10 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center animate-fadeIn max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 ring-1 ring-slate-100">
                       <Search className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Knowledge Query</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {files.length === 0 
                        ? "Upload and index documents to start your semantic search analysis." 
                        : activeCount === 0 
                          ? "Documents are still indexing or failed to process. Please wait for the green checkmark."
                          : "Ask questions based on your indexed store. Gemini will retrieve relevant fragments automatically."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8 max-w-3xl mx-auto w-full">
                    {messages.map(msg => <ChatMessageBubble key={msg.id} message={msg} />)}
                    <div ref={messagesEndRef} />
                  </div>
                )}
             </div>

             <div className="p-4 bg-white border-t border-slate-200 shadow-2xl z-10">
               <div className="max-w-3xl mx-auto w-full relative group">
                 <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={files.length === 0 ? "Upload files to initialize index..." : "Ask your documents..."}
                    className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none shadow-sm text-sm font-medium leading-relaxed placeholder:text-slate-400 disabled:opacity-50"
                    rows={1}
                    disabled={isProcessing || isSyncing}
                    aria-label="User Message"
                 />
                 <button 
                   onClick={handleSendMessage}
                   disabled={!inputValue.trim() || isProcessing || isSyncing || activeCount === 0}
                   className={`absolute right-2.5 bottom-2.5 p-2.5 rounded-xl transition-all shadow-sm ${
                     !inputValue.trim() || isProcessing || isSyncing || activeCount === 0
                        ? 'text-slate-300' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                   }`}
                   aria-label="Send Message"
                 >
                   {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                 </button>
               </div>
               <div className="max-w-3xl mx-auto w-full mt-2 px-1 flex justify-between items-center opacity-40">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Shift + Enter for multiline</span>
                  {activeCount > 0 && <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600">Native Vector RAG Enabled</span>}
               </div>
             </div>
           </section>
        </div>
      </main>
    </div>
  );
};

export default App;
