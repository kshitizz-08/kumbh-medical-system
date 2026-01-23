import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    language?: string; // e.g., 'en-US', 'hi-IN', 'mr-IN'
    className?: string;
}

export default function VoiceInput({
    onTranscript,
    language = 'en-US',
    className = '',
}: VoiceInputProps) {
    const { t } = useI18n();
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [recognition, setRecognition] = useState<any>(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 2;

    useEffect(() => {
        // Reset state when language changes
        setIsListening(false);
        setInterimTranscript('');
        retryCountRef.current = 0;

        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
            return;
        }

        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        // Enhanced configuration for better accuracy
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true; // Enable interim results for real-time feedback
        recognitionInstance.maxAlternatives = 5; // Increased from 3 to 5 for better accuracy
        recognitionInstance.lang = language;

        console.log('Initializing voice recognition for language:', language);

        recognitionInstance.onstart = () => {
            setIsListening(true);
            setInterimTranscript('');
            console.log('Voice recognition started for language:', language);
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
            console.log('Voice recognition ended');
        };

        recognitionInstance.onresult = (event: any) => {
            let interimText = '';
            let finalText = '';

            // Process all results
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];

                if (result.isFinal) {
                    // Get the best alternative based on confidence
                    let bestTranscript = result[0].transcript;
                    let bestConfidence = result[0].confidence;

                    // Check alternatives for better confidence
                    for (let j = 1; j < result.length; j++) {
                        if (result[j].confidence > bestConfidence) {
                            bestTranscript = result[j].transcript;
                            bestConfidence = result[j].confidence;
                        }
                    }

                    finalText += bestTranscript;
                    console.log('Final transcript:', bestTranscript, 'Confidence:', bestConfidence);
                } else {
                    // Show interim results
                    interimText += result[0].transcript;
                }
            }

            // Update interim transcript for visual feedback
            if (interimText) {
                setInterimTranscript(interimText);
            }

            // Submit final transcript
            if (finalText) {
                setInterimTranscript('');
                onTranscript(finalText.trim());
                retryCountRef.current = 0; // Reset retry count on success
            }
        };

        recognitionInstance.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            setInterimTranscript('');

            // Enhanced error handling
            switch (event.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    alert(t('common.voiceMicDenied') || 'Microphone access denied. Please allow microphone permissions in your browser settings.');
                    retryCountRef.current = 0;
                    break;

                case 'no-speech':
                    // Don't show error for no-speech, just retry if under limit
                    if (retryCountRef.current < MAX_RETRIES) {
                        console.log('No speech detected, retrying...', retryCountRef.current + 1);
                        retryCountRef.current += 1;
                        // Auto-retry after a short delay
                        setTimeout(() => {
                            try {
                                recognitionInstance.start();
                            } catch (e) {
                                console.warn('Could not restart recognition:', e);
                            }
                        }, 500);
                    } else {
                        console.log('Max retries reached for no-speech');
                        retryCountRef.current = 0;
                    }
                    break;

                case 'audio-capture':
                    alert(t('common.voiceNoMic') || 'No microphone was found. Please ensure a microphone is connected.');
                    retryCountRef.current = 0;
                    break;

                case 'network':
                    alert(t('common.voiceNetworkError') || 'Network error occurred. Please check your internet connection and try again.');
                    retryCountRef.current = 0;
                    break;

                case 'aborted':
                    // User stopped, no error needed
                    retryCountRef.current = 0;
                    break;

                default:
                    console.warn('Voice input error:', event.error);
                    retryCountRef.current = 0;
                    break;
            }
        };

        setRecognition(recognitionInstance);

        return () => {
            // Cleanup: Stop recognition when component unmounts or language changes
            console.log('Cleaning up voice recognition for language:', language);
            if (recognitionInstance) {
                try {
                    recognitionInstance.abort(); // Use abort() instead of stop() for immediate cleanup
                } catch (e) {
                    console.warn('Error during voice recognition cleanup:', e);
                }
            }
        };
    }, [language, onTranscript, t]); // Removed retryCount, isListening, recognition to prevent reinstantiation

    // Check for Secure Context (HTTPS) - required for Microphone on non-localhost
    useEffect(() => {
        if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
            setIsSupported(false);
            console.warn('Voice input requires HTTPS on non-localhost origins.');
        }
    }, []);

    const toggleListening = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission if inside a form

        if (!isSupported) {
            alert(t('common.voiceNotSupported') || 'Voice input is not supported in this browser.');
            return;
        }

        if (!recognition) {
            console.error('Recognition not initialized');
            return;
        }

        if (isListening) {
            try {
                recognition.stop();
                retryCountRef.current = 0;
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        } else {
            try {
                retryCountRef.current = 0;
                recognition.start();
            } catch (e) {
                console.error('Error starting recognition:', e);
                // If already started, stop and restart
                try {
                    recognition.stop();
                    setTimeout(() => recognition.start(), 100);
                } catch (e2) {
                    console.error('Error restarting recognition:', e2);
                }
            }
        }
    }, [isListening, recognition, isSupported, t]);

    if (!isSupported) return null;

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isListening
                    ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${className}`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
            >
                {isListening ? (
                    <MicOff className="w-5 h-5" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>

            {/* Interim transcript tooltip */}
            {interimTranscript && isListening && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                        <span>{interimTranscript}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
