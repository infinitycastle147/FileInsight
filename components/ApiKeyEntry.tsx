/**
 * ApiKeyEntry Component
 * 
 * Full-screen component for API key entry.
 * Displays privacy information and validates key format before submission.
 */

import React, { useState, useCallback } from 'react';
import { Key, Shield, Eye, EyeOff, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ApiKeyEntryProps {
    /** Callback when API key is successfully submitted */
    onApiKeySubmit: (apiKey: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Expected prefix for Google AI API keys */
const API_KEY_PREFIX = 'AIza';

/** URL to get an API key */
const API_KEY_URL = 'https://aistudio.google.com/apikey';

/** Validation delay (ms) for loading state */
const VALIDATION_DELAY = 500;

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Background decorative elements.
 */
const BackgroundDecoration: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
    </div>
);

/**
 * Logo and app title section.
 */
const LogoSection: React.FC = () => (
    <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-500/25 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">FileInsight</h1>
        <p className="text-slate-400">AI-powered document analysis with Gemini</p>
    </div>
);

/**
 * Privacy notice card.
 */
const PrivacyNotice: React.FC = () => (
    <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg flex-shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-1">
                    Your Privacy Matters
                </h3>
                <p className="text-xs text-emerald-200/70 leading-relaxed">
                    Your API key is stored only in your browser's session memory and is used exclusively
                    to make requests to Google's Gemini AI. It is never sent to our servers or stored
                    permanently. When you close this tab, the key is forgotten.
                </p>
            </div>
        </div>
    </div>
);

/**
 * Error message display.
 */
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="mt-2 text-sm text-rose-400 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        {message}
    </p>
);

/**
 * Link to get an API key.
 */
const GetApiKeyLink: React.FC = () => (
    <div className="text-sm">
        <span className="text-slate-400">Don't have an API key? </span>
        <a
            href={API_KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
        >
            Get one from Google AI Studio →
        </a>
    </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * API key entry form component.
 * 
 * Features:
 * - Password-masked input with toggle visibility
 * - Client-side format validation
 * - Privacy-first messaging
 * - Loading state during validation
 * 
 * @param props - Component props
 * 
 * @example
 * <ApiKeyEntry onApiKeySubmit={(key) => setApiKey(key)} />
 */
export const ApiKeyEntry: React.FC<ApiKeyEntryProps> = ({ onApiKeySubmit }) => {
    // State
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Validates the API key format.
     */
    const validateApiKey = useCallback((key: string): string | null => {
        if (!key.trim()) {
            return 'Please enter your API key';
        }

        if (!key.startsWith(API_KEY_PREFIX)) {
            return `Invalid API key format. Google API keys typically start with "${API_KEY_PREFIX}"`;
        }

        return null;
    }, []);

    /**
     * Handles form submission.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const validationError = validateApiKey(apiKey);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Show loading state
        setIsValidating(true);
        setError(null);

        // Brief delay for UX
        await new Promise(resolve => setTimeout(resolve, VALIDATION_DELAY));

        // Submit
        onApiKeySubmit(apiKey.trim());
        setIsValidating(false);
    };

    /**
     * Handles input change and clears errors.
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        setError(null);
    };

    /**
     * Toggles password visibility.
     */
    const toggleKeyVisibility = () => {
        setShowKey(prev => !prev);
    };

    const isSubmitDisabled = isValidating || !apiKey.trim();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
            <BackgroundDecoration />

            <div className="relative w-full max-w-md">
                <LogoSection />

                {/* Main form card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                            <Key className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Enter Your API Key</h2>
                            <p className="text-sm text-slate-400">Required to use Gemini AI features</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* API key input field */}
                        <div>
                            <label
                                htmlFor="apiKey"
                                className="block text-sm font-medium text-slate-300 mb-2"
                            >
                                Google AI API Key
                            </label>

                            <div className="relative">
                                <input
                                    id="apiKey"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={handleInputChange}
                                    placeholder="AIza..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all pr-12"
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-describedby={error ? 'api-key-error' : undefined}
                                />

                                <button
                                    type="button"
                                    onClick={toggleKeyVisibility}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                                >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {error && <ErrorMessage message={error} />}
                        </div>

                        {/* Get API key link */}
                        <GetApiKeyLink />

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
                        >
                            {isValidating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Validating...
                                </>
                            ) : (
                                <>
                                    Continue to FileInsight
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <PrivacyNotice />

                {/* Footer */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    Powered by Google Gemini 2.5 Flash
                </p>
            </div>
        </div>
    );
};
