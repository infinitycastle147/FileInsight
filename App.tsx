import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Trash2, 
  Send, 
  MessageSquare, 
  Settings,
  X,
  Database,
  Search,
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { FileDocument, ChatMessage, MessageRole } from './types';
import { FileUploader } from './components/FileUploader';
import { FileIcon } from './components/FileIcon';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { initializeChatSession, sendMessageStream, uploadFileToGemini } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]); // Track IDs of files being uploaded
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle file uploads
  const handleAddFiles = async (newFiles: FileDocument[]) => {
    // Add to state immediately
    setFiles(prev => [...prev, ...newFiles]);
    
    // Add to queue
    const newIds = newFiles.map(f => f.id);
    setUploadQueue(prev => [...prev, ...newIds]);

    // Process uploads one by one (or parallel, but sequential is safer for store consistency)
    for (const fileDoc of newFiles) {
      // Update status to uploading
      setFiles(prev => prev.map(f => f.id === fileDoc.id ? { ...f, status: 'uploading' } : f));
      
      try {
        const updatedDoc = await uploadFileToGemini(fileDoc);
        
        setFiles(prev => prev.map(f => f.id === fileDoc.id ? updatedDoc : f));
        
        if (updatedDoc.status === 'error') {
           // Handle error (maybe toast)
           console.error(`Failed to upload ${updatedDoc.name}: ${updatedDoc.error}`);
        }
      } catch (e) {
        console.error("Upload critical failure", e);
        setFiles(prev => prev.map(f => f.id === fileDoc.id ? { ...f, status: 'error' } : f));
      } finally {
        setUploadQueue(prev => prev.filter(id => id !== fileDoc.id));
      }
    }

    // After batch is done, re-init chat to ensure tool context is fresh
    await initializeChatSession();
    
    // Optional: Add system message
    const sysMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: MessageRole.SYSTEM,
      text: `File knowledge base updated. You can now ask questions about the new documents.`,
      timestamp: Date.now()
    };
    // setMessages(prev => [...prev, sysMsg]); // Uncomment if you want system messages in chat
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
    // Note: In a production app, we should also delete the file from the Gemini FileSearchStore here.
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // Check if we have active files
    const activeFiles = files.filter(f => f.status === 'active');
    if (activeFiles.length === 0) {
      alert("Please wait for files to finish processing before chatting.");
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: MessageRole.USER,
      text: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    const modelMsgId = crypto.randomUUID();
    const modelMsg: ChatMessage = {
      id: modelMsgId,
      role: MessageRole.MODEL,
      text: '', 
      timestamp: Date.now(),
      isStreaming: true
    };
    setMessages(prev => [...prev, modelMsg]);

    try {
      // We don't pass files array anymore, as the context is in the Store
      await sendMessageStream(userMsg.text, (chunk, metadata) => {
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
            ? { 
                ...msg, 
                text: msg.text + chunk,
                groundingMetadata: metadata || msg.groundingMetadata 
              } 
            : msg
        ));
      });
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, text: "I encountered an error processing your request. Please try again." } 
          : msg
      ));
    } finally {
      setIsProcessing(false);
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, isStreaming: false } 
          : msg
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const activeCount = files.filter(f => f.status === 'active').length;
  const isUploading = uploadQueue.length > 0;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar - File Manager */}
      <div 
        className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col relative flex-shrink-0 z-20`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">FileInsight</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-md lg:hidden">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Your Knowledge Base</h2>
            <FileUploader onFilesAdded={handleAddFiles} />
          </div>

          <div className="space-y-2">
             {files.length === 0 && (
                <div className="text-center text-slate-400 py-10">
                   <p className="text-sm">No files uploaded yet.</p>
                </div>
             )}
             {files.map(file => (
               <div 
                  key={file.id} 
                  onClick={() => setActiveFileId(file.id === activeFileId ? null : file.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    activeFileId === file.id 
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
               >
                 <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="relative">
                       <FileIcon fileName={file.name} />
                       {/* Status Badge */}
                       <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                          {file.status === 'active' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          {(file.status === 'uploading' || file.status === 'processing') && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                          {file.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                       </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                       <span className={`text-sm font-medium truncate ${activeFileId === file.id ? 'text-indigo-900' : 'text-slate-700'}`}>{file.name}</span>
                       <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-2 justify-center text-xs text-slate-500">
             <Globe className="w-3 h-3" />
             <span>Web Search Grounding Enabled</span>
           </div>
           <div className="text-[10px] text-slate-400 text-center mt-1">
             Powered by Gemini 2.5 Flash
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              {activeFile ? (
                 <>
                   <span className="text-slate-400">Previewing:</span> 
                   <span className="text-indigo-600">{activeFile.name}</span>
                 </>
              ) : (
                 <>
                   <MessageSquare className="w-4 h-4 text-slate-400" />
                   Chat
                 </>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
              <span className={`hidden sm:inline text-xs font-medium px-2 py-1 rounded-full ${isUploading ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isUploading ? 'Syncing Files...' : `${activeCount} Active Doc${activeCount !== 1 ? 's' : ''}`}
              </span>
              <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <Settings className="w-5 h-5" />
              </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden relative">
           
           {/* File Preview Pane */}
           {activeFile && (
              <div className="flex-1 bg-white overflow-auto border-r border-slate-200 p-8 max-w-2xl hidden lg:block">
                 <div className="prose prose-slate max-w-none">
                    <pre className="text-xs bg-slate-50 p-4 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap">
                      {activeFile.content}
                    </pre>
                 </div>
              </div>
           )}

           {/* Chat Area */}
           <div className={`flex-1 flex flex-col bg-slate-50 relative ${activeFile ? 'lg:max-w-[50%]' : ''}`}>
             
             {/* Messages List */}
             <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.5s forwards' }}>
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                       <Search className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Ready to analyze your files</h3>
                    <p className="text-slate-500 max-w-md">
                      Upload documents on the left sidebar. Gemini will ingest them into its File Search engine for accurate answers.
                    </p>
                    {activeCount > 0 && (
                      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
                        {["Summarize the documents", "Find the key dates", "What is the main topic?"].map(q => (
                          <button 
                            key={q}
                            onClick={() => { setInputValue(q); }}
                            className="text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 max-w-3xl mx-auto w-full">
                    {messages.map(msg => (
                      <ChatMessageBubble key={msg.id} message={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
             </div>

             {/* Input Area */}
             <div className="p-4 bg-white border-t border-slate-200">
               <div className="max-w-3xl mx-auto w-full relative">
                 <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={files.length === 0 ? "Upload files to start chatting..." : "Ask a question about your files..."}
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none shadow-sm text-sm"
                    rows={1}
                    style={{ minHeight: '52px', maxHeight: '120px' }}
                    disabled={isProcessing || isUploading || files.length === 0}
                 />
                 <button 
                   onClick={handleSendMessage}
                   disabled={!inputValue.trim() || isProcessing || isUploading || files.length === 0}
                   className={`absolute right-2 top-2 p-2 rounded-lg transition-all ${
                     !inputValue.trim() || isProcessing || isUploading
                       ? 'text-slate-300 bg-transparent cursor-not-allowed' 
                       : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                   }`}
                 >
                   {isProcessing || isUploading ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <Send className="w-5 h-5" />
                   )}
                 </button>
               </div>
               <div className="text-center mt-2">
                 <p className="text-[10px] text-slate-400">
                   {isUploading ? "Syncing files to Gemini Search Store..." : "AI can make mistakes. Please verify important information."}
                 </p>
               </div>
             </div>
           </div>

        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;