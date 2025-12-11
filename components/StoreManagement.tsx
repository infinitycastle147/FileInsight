/**
 * StoreManagement Component
 * 
 * Provides a management interface for Gemini file search stores.
 * Allows users to view and delete their file stores.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Database,
    Trash2,
    RefreshCw,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    Calendar,
    HardDrive,
    XCircle
} from 'lucide-react';
import { listFileStores, deleteFileStore } from '../services/geminiService';
import { formatDate } from '../utils';

// =============================================================================
// TYPES
// =============================================================================

interface FileStore {
    name?: string;
    displayName?: string;
    createTime?: string;
    updateTime?: string;
}

interface StoreManagementProps {
    /** Callback to navigate back to the main view */
    onBack: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts the store ID from a full resource name.
 * 
 * @param name - Full resource name (e.g., "fileSearchStores/abc123")
 * @returns The store ID (e.g., "abc123")
 */
const extractStoreId = (name?: string): string => {
    if (!name) return 'unknown';
    const parts = name.split('/');
    return parts[parts.length - 1];
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Header component with navigation and refresh button.
 */
const Header: React.FC<{
    onBack: () => void;
    onRefresh: () => void;
    isLoading: boolean;
}> = ({ onBack, onRefresh, isLoading }) => (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
            <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Go back"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl shadow-sm">
                    <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-slate-800 text-lg">File Search Stores</h1>
                    <p className="text-xs text-slate-400">Manage your Gemini file search stores</p>
                </div>
            </div>
        </div>

        <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
        >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
        </button>
    </header>
);

/**
 * Error banner component.
 */
const ErrorBanner: React.FC<{
    message: string;
    onDismiss: () => void;
}> = ({ message, onDismiss }) => (
    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
        <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
            <p className="text-sm font-medium text-rose-800">{message}</p>
        </div>
        <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-600"
            aria-label="Dismiss error"
        >
            <XCircle className="w-4 h-4" />
        </button>
    </div>
);

/**
 * Loading state component.
 */
const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500">Loading file stores...</p>
    </div>
);

/**
 * Empty state when no stores exist.
 */
const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
            <HardDrive className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No File Stores Found</h3>
        <p className="text-slate-500 max-w-md">
            File stores are created automatically when you upload files. Go back and upload some documents to create your first store.
        </p>
    </div>
);

/**
 * Warning notice about deletion consequences.
 */
const DeletionWarning: React.FC = () => (
    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
            <p className="text-sm font-medium text-amber-800">Caution</p>
            <p className="text-xs text-amber-700 mt-1">
                Deleting a file store will permanently remove all indexed files and their embeddings.
                This action cannot be undone. The current chat session will lose access to files in deleted stores.
            </p>
        </div>
    </div>
);

/**
 * Delete confirmation buttons.
 */
const DeleteConfirmation: React.FC<{
    storeName: string;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ storeName, isDeleting, onConfirm, onCancel }) => (
    <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-slate-500">Are you sure?</span>
        <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
            {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete
        </button>
        <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
        >
            Cancel
        </button>
    </div>
);

/**
 * Single store card component.
 */
const StoreCard: React.FC<{
    store: FileStore;
    isConfirmingDelete: boolean;
    isDeleting: boolean;
    onDeleteClick: () => void;
    onDeleteConfirm: () => void;
    onDeleteCancel: () => void;
}> = ({
    store,
    isConfirmingDelete,
    isDeleting,
    onDeleteClick,
    onDeleteConfirm,
    onDeleteCancel
}) => (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="bg-indigo-50 p-3 rounded-xl flex-shrink-0">
                        <Database className="w-6 h-6 text-indigo-600" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-800 truncate mb-1">
                            {store.displayName || 'Unnamed Store'}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono truncate mb-3">
                            {extractStoreId(store.name)}
                        </p>

                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            {store.createTime && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Created: {formatDate(store.createTime)}</span>
                                </div>
                            )}
                            {store.updateTime && (
                                <div className="flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Updated: {formatDate(store.updateTime)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete button or confirmation */}
                {isConfirmingDelete ? (
                    <DeleteConfirmation
                        storeName={store.name || ''}
                        isDeleting={isDeleting}
                        onConfirm={onDeleteConfirm}
                        onCancel={onDeleteCancel}
                    />
                ) : (
                    <button
                        onClick={onDeleteClick}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                        title="Delete store"
                        aria-label="Delete store"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Store management page component.
 * 
 * Features:
 * - Lists all file search stores
 * - Allows deletion with confirmation
 * - Shows loading and error states
 * - Refresh functionality
 * 
 * @param props - Component props
 * 
 * @example
 * <StoreManagement onBack={() => setPage('chat')} />
 */
export const StoreManagement: React.FC<StoreManagementProps> = ({ onBack }) => {
    // State
    const [stores, setStores] = useState<FileStore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingStore, setDeletingStore] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    /**
     * Fetches the list of file stores.
     */
    const fetchStores = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await listFileStores();
            const storeList: FileStore[] = [];

            for await (const store of result) {
                storeList.push(store);
            }

            setStores(storeList);
        } catch (err: any) {
            console.error('Failed to fetch stores:', err);
            setError(err.message || 'Failed to load file stores');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch stores on mount
    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    /**
     * Handles store deletion.
     */
    const handleDeleteStore = async (storeName: string) => {
        setDeletingStore(storeName);

        try {
            await deleteFileStore(storeName);
            setStores(prev => prev.filter(s => s.name !== storeName));
            setConfirmDelete(null);
        } catch (err: any) {
            console.error('Failed to delete store:', err);
            setError(`Failed to delete store: ${err.message}`);
        } finally {
            setDeletingStore(null);
        }
    };

    // Filter out stores without names
    const validStores = stores.filter(s => s.name);

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Header
                onBack={onBack}
                onRefresh={fetchStores}
                isLoading={isLoading}
            />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">

                    {/* Error banner */}
                    {error && (
                        <ErrorBanner message={error} onDismiss={() => setError(null)} />
                    )}

                    {/* Loading state */}
                    {isLoading && <LoadingState />}

                    {/* Empty state */}
                    {!isLoading && validStores.length === 0 && !error && <EmptyState />}

                    {/* Store list */}
                    {!isLoading && validStores.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm text-slate-500">
                                    Found <span className="font-semibold text-slate-700">{validStores.length}</span> file store{validStores.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {validStores.map((store) => (
                                <StoreCard
                                    key={store.name}
                                    store={store}
                                    isConfirmingDelete={confirmDelete === store.name}
                                    isDeleting={deletingStore === store.name}
                                    onDeleteClick={() => setConfirmDelete(store.name || null)}
                                    onDeleteConfirm={() => store.name && handleDeleteStore(store.name)}
                                    onDeleteCancel={() => setConfirmDelete(null)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Warning notice */}
                    <DeletionWarning />
                </div>
            </div>
        </div>
    );
};
