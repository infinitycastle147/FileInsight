import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Menu, Trash2, MessageSquare, X, Database, Search, 
  Loader2, AlertCircle, CheckCircle2, Eraser, ArrowRight, 
  Sparkles
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
    const uploadingFiles = newFiles.map(f => ({ ...f, status: 'uploading' as const }));
    setFiles(prev => [...prev, ...uploadingFiles]);
    
    // Upload sequentially to ensure stable store creation
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
        // Refresh session to clear context of deleted file
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
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-slate-900 font-sans">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-[320px]' : 'w-0'} bg-white border-r border-slate-200/60 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col relative flex-shrink-0 z-20 shadow-xl shadow-slate-200/50`}
      >
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">FileInsight</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-2 hover:bg-slate-50 rounded-lg lg:hidden text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <section className="mb-8">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Upload Source
            </h2>
            <FileUploader onFilesAdded={handleAddFiles} />
          </section>

          <nav className="space-y-3">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
              Indexed Knowledge
            </h2>
             {files.length === 0 && (
               <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                 <p className="text-xs text-slate-500 font-medium">No documents yet</p>
                 <p className="text-[10px] text-slate-400 mt-1">Upload to start analysis</p>
               </div>
             )}
             {files.map(file => (
               <div key={file.id} className="group relative">
                 <div 
                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                      activeFileId === file.id 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/10' 
                        : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'
                    } ${file.status === 'error' ? 'border-red-100 bg-red-50/20' : ''}`}
                 >
                   <button 
                      onClick={() => setActiveFileId(file.id === activeFileId ? null : file.id)}
                      className="relative shrink-0 mt-0.5 focus:outline-none"
                    >
                      <FileIcon fileName={file.name} className="w-9 h-9" />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        {file.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-white" />}
                        {(file.status === 'uploading' || file.status === 'processing' || file.status === 'pending') && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                        {file.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                   </button>
                   
                   <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                      <button 
                        onClick={() => setActiveFileId(file.id === activeFileId ? null : file.id)}
                        className={`text-sm font-semibold truncate text-left focus:outline-none transition-colors ${
                          activeFileId === file.id ? 'text-indigo-900' : 'text-slate-700 hover:text-indigo-700'
                        }`}
                      >
                        {file.name}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                        {file.status === 'error' && (
                          <span className="text-[9px] text-red-600 font-bold uppercase flex items-center gap-1 group/err relative cursor-help">
                            Error
                            <span className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] normal-case rounded-lg opacity-0 group-hover/err:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl">
                              {file.error || "Unknown indexing error"}
                            </span>
                          </span>
                        )}
                      </div>
                   </div>

                   {confirmDeleteId === file.id ? (
                     <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center p-2 border border-red-100 shadow-sm animate-fadeIn">
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="text-[10px] font-bold text-white bg-red-500 px-3 py-1.5 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                        >
                          Delete
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] font-bold text-slate-500 px-3 py-1.5 hover:bg-slate-100 rounded-lg ml-1 transition-colors"
                        >
                          Cancel
                        </button>
                     </div>
                   ) : (
                     <button 
                        onClick={() => setConfirmDeleteId(file.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                        title="Remove file"
                      >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                 </div>
               </div>
             ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 backdrop-blur-sm">
           <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             <span>System Online</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-white/50">
        {/* Header */}
        <header className="h-16 border-b border-slate-200/50 flex items-center justify-between px-6 sticky top-0 z-30 glass">
          <div className="flex items-center gap-4 overflow-hidden">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 -ml-2 hover:bg-white rounded-xl text-slate-500 shadow-sm border border-transparent hover:border-slate-200 transition-all"
                title="Expand Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-bold text-slate-800 flex items-center gap-3 truncate">
              {activeFile ? (
                <div className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider">Preview</span> 
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-600 truncate max-w-[200px]">{activeFile.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">Contextual Analysis Terminal</span>
                </div>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={clearChat}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                title="Clear Chat History"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                isSyncing 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                  : activeCount > 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Syncing Index...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3 h-3" />
                    <span>{activeCount} Sources Active</span>
                  </>
                )}
              </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
           {/* Document Preview Pane */}
           {activeFile && (
              <section 
                className="flex-1 bg-white overflow-hidden border-r border-slate-200/60 max-w-2xl hidden lg:flex flex-col animate-slideInRight shadow-[inset_-10px_0_20px_-10px_rgba(0,0,0,0.02)]"
              >
                 <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Content</span>
                    <button 
                      onClick={() => setActiveFileId(null)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>
                 <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                    {activeFile.content ? (
                      <pre className="text-xs font-mono leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {activeFile.content}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-200" />
                        <span className="text-xs font-medium uppercase tracking-widest">Loading Preview...</span>
                      </div>
                    )}
                 </div>
              </section>
           )}

           {/* Chat Area */}
           <section 
             className={`flex-1 flex flex-col relative transition-all duration-300 ${activeFile ? 'lg:max-w-[50%]' : ''}`}
           >
             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth" id="chat-container">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center animate-fadeIn px-4">
                    <div className="w-20 h-20 bg-gradient-to-tr from-white to-slate-50 rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center mb-8 ring-1 ring-slate-100 transform rotate-3 transition-transform hover:rotate-0 duration-500">
                       <Search className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Knowledge Retrieval</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-8">
                      {files.length === 0 
                        ? "Upload documents to the sidebar to construct your personal knowledge base." 
                        : activeCount === 0 
                          ? "Processing your documents. The neural index will be ready shortly."
                          : "Your knowledge base is active. Ask complex questions to synthesize information across files."}
                    </p>
                    {files.length === 0 && (
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200/50">
                        <span>.PDF</span>
                        <span>.CSV</span>
                        <span>.JSON</span>
                        <span>.MD</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto w-full space-y-8 pb-4">
                    {messages.map(msg => <ChatMessageBubble key={msg.id} message={msg} />)}
                    {isProcessing && (
                      <div className="flex justify-start animate-fadeIn">
                        <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                           <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                           </div>
                           <span className="text-xs font-medium text-slate-400">Analyzing...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
             </div>

             {/* Input Area - Floating */}
             <div className="p-4 md:p-6 sticky bottom-0 z-20 pointer-events-none">
               <div className="max-w-3xl mx-auto w-full pointer-events-auto">
                 <div className="relative group bg-white rounded-[24px] shadow-2xl shadow-indigo-900/5 border border-slate-200 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
                   <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder={files.length === 0 ? "Waiting for documents..." : "Ask a question about your files..."}
                      className="w-full pl-6 pr-16 py-4 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-sm md:text-base font-medium text-slate-700 placeholder:text-slate-400 max-h-[200px] overflow-y-auto"
                      rows={1}
                      disabled={isProcessing || isSyncing}
                      style={{ minHeight: '60px' }}
                   />
                   
                   <div className="absolute right-2 bottom-2">
                     <button 
                       onClick={handleSendMessage}
                       disabled={!inputValue.trim() || isProcessing || isSyncing || activeCount === 0}
                       className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                         !inputValue.trim() || isProcessing || isSyncing || activeCount === 0
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 active:scale-95'
                       }`}
                     >
                       {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                     </button>
                   </div>
                 </div>
                 
                 <div className="mt-3 text-center opacity-60 transition-opacity hover:opacity-100">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Gemini 2.5 Flash • {activeCount} Documents Active • <span className="hidden sm:inline">Shift + Enter for new line</span>
                    </span>
                 </div>
               </div>
             </div>
           </section>
        </div>
      </main>
    </div>
  );
};

export default App;