import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

// Type definition for Web Speech API
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
    onstart: () => void;
}

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    language?: string; // 'en-US', 'hi-IN', 'mr-IN'
    className?: string;
}

export default function VoiceInput({ onTranscript, language = 'en-US', className = '' }: VoiceInputProps) {
    const { t } = useI18n();
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 2;

    useEffect(() => {
        // Reset state on language change
        setIsListening(false);
        setInterimTranscript('');
        setError(null); // Clear errors on language change
        retryCountRef.current = 0;

        // Abort any existing recognition instance
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) {
                console.log('Error aborting recognition:', e);
            }
            recognitionRef.current = null;
        }

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError('Voice recognition not supported in this browser.');
            return;
        }

        // Small delay to ensure previous instance is fully cleaned up
        const initTimeout = setTimeout(() => {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = false; // We want short phrases, not dictation
            recognitionInstance.interimResults = true; // Show results as they speak
            recognitionInstance.lang = language;
            recognitionInstance.maxAlternatives = 5; // Get more options for better accuracy

            recognitionInstance.onstart = () => {
                setIsListening(true);
                setError(null);
                setInterimTranscript('');
            };

            recognitionInstance.onresult = (event: any) => {
                let finalTranscript = '';
                let interim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    onTranscript(finalTranscript);
                    // Reset retry count on success
                    retryCountRef.current = 0;
                }

                setInterimTranscript(interim);
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);

                if (event.error === 'no-speech') {
                    if (retryCountRef.current < MAX_RETRIES) {
                        retryCountRef.current += 1;
                        console.log(`Retry ${retryCountRef.current} for no-speech`);
                        try {
                            recognitionInstance.start();
                            return; // Don't show error yet
                        } catch (e) {
                            // ignore restart error
                        }
                    } else {
                        setError(t('common.voiceNoMic') || 'No speech detected');
                    }
                } else if (event.error === 'not-allowed') {
                    setError(t('common.voiceMicDenied') || 'Microphone access denied');
                } else if (event.error === 'network') {
                    setError(t('common.voiceNetworkError') || 'Network error');
                } else {
                    setError('Error occurred in recognition: ' + event.error);
                }
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
                setInterimTranscript(''); // Clear visual feedback
            };

            recognitionRef.current = recognitionInstance;
        }, 100); // 100ms delay to ensure cleanup

        return () => {
            clearTimeout(initTimeout);
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    console.log('Cleanup error:', e);
                }
            }
        };
    }, [language, onTranscript, t]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setError(null);
            retryCountRef.current = 0;
            try {
                // First abort any running instance (defensive)
                if (recognitionRef.current) {
                    try {
                        recognitionRef.current.abort();
                    } catch (e) {
                        // Ignore abort errors
                    }
                    // Small delay to ensure cleanup before starting
                    setTimeout(() => {
                        try {
                            recognitionRef.current?.start();
                        } catch (err: any) {
                            console.error('Failed to start recognition:', err);
                            if (err.message && err.message.includes('already started')) {
                                // If still getting "already started", force abort and retry once
                                try {
                                    recognitionRef.current?.abort();
                                    setTimeout(() => {
                                        try {
                                            recognitionRef.current?.start();
                                        } catch (e) {
                                            setError('Could not start microphone. Please try again.');
                                        }
                                    }, 150);
                                } catch (e) {
                                    setError('Could not start microphone.');
                                }
                            } else {
                                setError('Could not start microphone.');
                            }
                        }
                    }, 50);
                }
            } catch (err) {
                console.error('Failed to start recognition:', err);
                setError('Could not start microphone.');
            }
        }
    };

    if (error) {
        return (
            <div className="relative inline-block">
                <button
                    type="button"
                    onClick={() => setError(null)}
                    className={`p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors ${className}`}
                    title={error}
                >
                    <AlertCircle className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative inline-block">
            {isListening && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-full whitespace-nowrap z-50 pointer-events-none">
                    {interimTranscript || t('common.listening')}...
                </div>
            )}

            <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-all duration-200 ${isListening
                    ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400 ring-opacity-50'
                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200 hover:scale-105'
                    } ${className}`}
                title={isListening ? t('common.stopVoice') : t('common.startVoice')}
            >
                {isListening ? (
                    <MicOff className="w-5 h-5" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
        </div>
    );
}
