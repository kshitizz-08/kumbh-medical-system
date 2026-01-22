import { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    language?: string; // e.g., 'en-US', 'hi-IN', 'mr-IN'
    className?: string;
    placeholder?: string;
}

export default function VoiceInput({
    onTranscript,
    language = 'en-US',
    className = '',
    placeholder
}: VoiceInputProps) {
    const { t } = useI18n();
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
            return;
        }

        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = language;

        recognitionInstance.onstart = () => {
            setIsListening(true);
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        recognitionInstance.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onTranscript(transcript);
        };

        recognitionInstance.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        setRecognition(recognitionInstance);
    }, [language, onTranscript]);

    const toggleListening = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission if inside a form

        if (!isSupported) {
            alert(t('common.voiceNotSupported') || 'Voice input is not supported in this browser.');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }, [isListening, recognition, isSupported, t]);

    if (!isSupported) return null;

    return (
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
    );
}
