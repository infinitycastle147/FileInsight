/**
 * Custom hook for managing chat messages and AI interactions
 * 
 * Extracts all chat-related logic from the main App component
 * for better separation of concerns and reusability.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole, FileDocument } from '../types';
import { sendMessageStream, initializeChatSession } from '../services/geminiService';
import { generateId } from '../utils';

/**
 * Return type for the useChatManager hook.
 */
export interface UseChatManagerReturn {
    /** List of all chat messages */
    messages: ChatMessage[];

    /** Current input value */
    inputValue: string;

    /** Whether a message is being processed */
    isProcessing: boolean;

    /** Reference to scroll to bottom of messages */
    messagesEndRef: React.RefObject<HTMLDivElement>;

    /** Update the input value */
    setInputValue: (value: string) => void;

    /** Send a message to the AI */
    sendMessage: (files: FileDocument[]) => Promise<void>;

    /** Handle Enter key press */
    handleKeyDown: (e: React.KeyboardEvent, files: FileDocument[]) => void;

    /** Clear all messages */
    clearMessages: () => void;
}

/**
 * Hook for managing chat messages and AI interactions.
 * 
 * Handles:
 * - Message state management
 * - Sending messages to Gemini API
 * - Streaming responses
 * - Auto-scrolling to latest message
 * 
 * @returns Chat management state and functions
 * 
 * @example
 * const { messages, sendMessage, inputValue, setInputValue } = useChatManager();
 */
export const useChatManager = (): UseChatManagerReturn => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    /**
     * Scrolls to the bottom of the messages container.
     */
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Auto-scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    /**
     * Adds a message to the messages array.
     */
    const addMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
    }, []);

    /**
     * Updates a message by ID.
     */
    const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
        setMessages(prev => prev.map(msg =>
            msg.id === id ? { ...msg, ...updates } : msg
        ));
    }, []);

    /**
     * Sends a message to the AI and handles the streaming response.
     */
    const sendMessage = useCallback(async (files: FileDocument[]): Promise<void> => {
        // Validate input
        if (!inputValue.trim() || isProcessing) return;

        // Check for active files
        const activeFiles = files.filter(f => f.status === 'active');
        if (activeFiles.length === 0) {
            alert("Please wait for files to finish processing before chatting.");
            return;
        }

        // Create and add user message
        const userMessage: ChatMessage = {
            id: generateId(),
            role: MessageRole.USER,
            text: inputValue,
            timestamp: Date.now()
        };
        addMessage(userMessage);

        // Clear input and start processing
        setInputValue('');
        setIsProcessing(true);

        // Create placeholder for model response
        const modelMessageId = generateId();
        const modelMessage: ChatMessage = {
            id: modelMessageId,
            role: MessageRole.MODEL,
            text: '',
            timestamp: Date.now(),
            isStreaming: true
        };
        addMessage(modelMessage);

        try {
            // Ensure chat session is initialized
            if (!await ensureChatSession()) {
                throw new Error("Failed to initialize chat session");
            }

            // Send message and stream response
            await sendMessageStream(userMessage.text, (chunk, metadata) => {
                updateMessage(modelMessageId, {
                    text: messages.find(m => m.id === modelMessageId)?.text + chunk || chunk,
                    groundingMetadata: metadata
                });

                // Handle streaming update by setting text cumulatively
                setMessages(prev => prev.map(msg =>
                    msg.id === modelMessageId
                        ? {
                            ...msg,
                            text: msg.text + chunk,
                            groundingMetadata: metadata || msg.groundingMetadata
                        }
                        : msg
                ));
            });
        } catch (error) {
            console.error("Error sending message:", error);
            updateMessage(modelMessageId, {
                text: "I encountered an error processing your request. Please try again."
            });
        } finally {
            setIsProcessing(false);
            updateMessage(modelMessageId, { isStreaming: false });
        }
    }, [inputValue, isProcessing, addMessage, updateMessage]);

    /**
     * Ensures chat session is initialized.
     */
    const ensureChatSession = async (): Promise<boolean> => {
        try {
            await initializeChatSession();
            return true;
        } catch (error) {
            console.error("Failed to initialize chat session:", error);
            return false;
        }
    };

    /**
     * Handles Enter key press to send message.
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent, files: FileDocument[]) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(files);
        }
    }, [sendMessage]);

    /**
     * Clears all messages.
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        inputValue,
        isProcessing,
        messagesEndRef,
        setInputValue,
        sendMessage,
        handleKeyDown,
        clearMessages
    };
};
