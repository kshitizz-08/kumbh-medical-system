import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

// Extend the Window interface to include webkitSpeechRecognition
declare global {
    interface Window {
        webkitSpeechRecognition: any;
    }
}

type VoiceInputProps = {
    onTranscript: (text: string) => void;
    language?: string;
    label?: string; // If provided, adds a "read label" button
};

export default function VoiceInput({ onTranscript, language = 'mr-IN', label }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;

            // Map app languages to speech recognition codes
            // 'mr' -> 'mr-IN', 'hi' -> 'hi-IN', 'en' -> 'en-US'
            const langMap: Record<string, string> = {
                'mr': 'mr-IN',
                'hi': 'hi-IN',
                'en': 'en-US'
            };

            // Use prop language if it's a full code (e.g. mr-IN), otherwise map it
            const code = langMap[language] || language;
            recognition.lang = code;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onTranscript(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [language, onTranscript]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };

    const speakLabel = () => {
        if (!label) return;

        // Simple Text-to-Speech
        const utterance = new SpeechSynthesisUtterance(label);

        // Map basic lang codes for TTS
        const langMap: Record<string, string> = {
            'mr': 'hi-IN', // Fallback to Hindi voice for Marathi if Marathi specific not found commonly, but try mr-IN
            'hi': 'hi-IN',
            'en': 'en-US'
        };

        // Attempt exact match first
        utterance.lang = langMap[language] || language;
        if (language === 'mr') utterance.lang = 'mr-IN';

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);

        window.speechSynthesis.speak(utterance);
    };

    if (!('webkitSpeechRecognition' in window)) {
        return null; // Fallback for unsupported browsers (don't show mic)
    }

    return (
        <div className="flex items-center gap-2">
            {label && (
                <button
                    type="button"
                    onClick={speakLabel}
                    className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Read Label"
                >
                    <Volume2 className="w-5 h-5" />
                </button>
            )}
            <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-all ${isListening
                    ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400'
                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                title={isListening ? 'Stop Listening' : 'Speak to Type'}
            >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
        </div>
    );
}
