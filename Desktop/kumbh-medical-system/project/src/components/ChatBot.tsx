import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
};

export default function ChatBot() {
    const { lang } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const quickQuestions = [
        { label: '🚑 Emergency', text: 'Emergency help' },
        { label: '🏥 Hospital', text: 'Where is the hospital?' },
        { label: '☀️ Heat Stroke', text: 'I feel dizzy (Heat Stroke)' },
        { label: '📋 Register', text: 'How to register?' },
    ];

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            // Add welcome message if no messages
            if (messages.length === 0) {
                addBotMessage(getWelcomeMessage());
            }
        }
    }, [isOpen]);

    const getWelcomeMessage = () => {
        if (lang === 'hi') {
            return 'नमस्ते! 🙏 कुंभ मेला मेडिकल सेवा में आपका स्वागत है। मैं आपकी चिकित्सा जानकारी और मार्गदर्शन में मदद के लिए यहां हूं। आज मैं आपकी कैसे सहायता कर सकता हूं?';
        } else if (lang === 'mr') {
            return 'नमस्ते! 🙏 कुंभ मेळा मेडिकल सेवेत आपले स्वागत आहे. मी तुम्हाला वैद्यकीय माहिती आणि मार्गदर्शनात मदत करण्यासाठी येथे आहे. आज मी तुम्हाला कशी मदत करू शकतो?';
        }
        return 'Namaste! 🙏 Welcome to Kumbh Mela Medical Seva. I\'m here to help with medical information and guidance. How can I assist you today?';
    };

    const addBotMessage = (text: string) => {
        const botMessage: Message = {
            id: Date.now().toString() + '-bot',
            text,
            sender: 'bot',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
    };

    const handleSend = async (text?: string) => {
        if ((!text && !inputText.trim()) || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString() + '-user',
            text: text || inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setShowSuggestions(false);
        setIsLoading(true);

        try {
            const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
            const response = await fetch(`${API_BASE}/chatbot/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: text || inputText,
                    language: lang,
                    history: messages.slice(-10).map((m) => ({
                        role: m.sender === 'user' ? 'user' : 'assistant',
                        content: m.text,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            addBotMessage(data.response);
        } catch (error) {
            console.error('Chatbot error:', error);
            addBotMessage(
                lang === 'hi'
                    ? 'क्षमा करें, मुझे प्रतिक्रिया देने में समस्या हो रही है। कृपया बाद में पुनः प्रयास करें।'
                    : lang === 'mr'
                        ? 'माफ करा, मला प्रतिसाद देण्यात समस्या येत आहे. कृपया नंतर पुन्हा प्रयत्न करा.'
                        : 'Sorry, I\'m having trouble responding. Please try again later.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating chat button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
                    aria-label="Open medical chatbot"
                >
                    <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                </button>
            )}

            {/* Chat window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-slide-up border border-gray-200">
                    {/* Chat header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                                <Bot className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-base">
                                    {lang === 'hi' ? 'मेडिकल सहायक' : lang === 'mr' ? 'वैद्यकीय सहाय्यक' : 'Medical Assistant'}
                                </h3>
                                <p className="text-xs text-blue-100">
                                    {lang === 'hi' ? 'ऑनलाइन • यहाँ मदद के लिए' : lang === 'mr' ? 'ऑनलाइन • मदतीसाठी येथे' : 'Online • Here to help'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.sender === 'bot' && (
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${message.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                    <p
                                        className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                                            }`}
                                    >
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                {message.sender === 'user' && (
                                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                        <span className="text-sm text-gray-500">
                                            {lang === 'hi' ? 'टाइप कर रहा है...' : lang === 'mr' ? 'टाइप करत आहे...' : 'Typing...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Suggestions */}
                    {showSuggestions && messages.length < 2 && (
                        <div className="px-4 pb-2 bg-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
                            {quickQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q.text)}
                                    className="whitespace-nowrap bg-white border border-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input area */}
                    <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={
                                    lang === 'hi'
                                        ? 'अपना संदेश टाइप करें...'
                                        : lang === 'mr'
                                            ? 'तुमचा संदेश टाइप करा...'
                                            : 'Type your message...'
                                }
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!inputText.trim() || isLoading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                aria-label="Send message"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            {lang === 'hi'
                                ? 'AI सहायक • आपातकाल के लिए 108 पर कॉल करें'
                                : lang === 'mr'
                                    ? 'AI सहाय्यक • आपत्कालासाठी 108 वर कॉल करा'
                                    : 'AI Assistant • Call 108 for emergencies'}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
