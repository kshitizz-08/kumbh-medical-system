import { useState, useRef, useEffect, useCallback } from 'react';
import {
    MessageCircle, X, Send, Bot, User, Sparkles,
    RefreshCw, Copy, Check, ChevronDown, Zap
} from 'lucide-react';
import { useI18n } from '../i18n/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    streaming?: boolean;
};

// ── Backend API base ───────────────────────────────────────────────────────────
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:4px;font-size:0.85em;font-family:monospace">$1</code>')
        .replace(/^- (.+)$/gm, '<li style="margin-left:1rem;list-style-type:disc">$1</li>')
        .replace(/(<li[\s\S]*?<\/li>)(\n<li|$)/gm, (m) =>
            m.startsWith('<li') ? m : m
        )
        .replace(/(\n)?(<li[\s\S]*?<\/li>)(\n)?/g, '<ul style="margin:4px 0">$2</ul>')
        .replace(/\n\n/g, '</p><p style="margin-top:8px">')
        .replace(/\n/g, '<br/>');
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            title="Copy"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
    return (
        <div className="flex items-center gap-1 py-1">
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-400"
                    style={{ animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
            ))}
        </div>
    );
}

// ── Simulate streaming by revealing text word-by-word ─────────────────────────
async function streamText(
    fullText: string,
    onChunk: (partial: string) => void,
    onDone: () => void
) {
    const words = fullText.split(' ');
    let current = '';
    for (const word of words) {
        current += (current ? ' ' : '') + word;
        onChunk(current);
        // vary speed slightly for realism
        await new Promise(r => setTimeout(r, 18 + Math.random() * 22));
    }
    onDone();
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatBot() {
    const { lang } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const historyRef = useRef<{ role: string; content: string }[]>([]);
    const textareaRef = inputRef;

    const quickQuestions = [
        { label: '🚑 Emergency', text: 'What should I do in a medical emergency at Kumbh Mela?' },
        { label: '☀️ Heat Stroke', text: 'How to treat heat stroke?' },
        { label: '💧 Dehydration', text: 'Signs of dehydration and how to treat it?' },
        { label: '🏥 Hospital', text: 'Where is the nearest hospital at Kumbh Mela Nashik?' },
        { label: '🤒 Fever', text: 'How to manage fever without medicine?' },
        { label: '🧴 Hygiene', text: 'Tips for staying healthy at a crowded festival' },
    ];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => textareaRef.current?.focus(), 100);
            if (messages.length === 0) addWelcome();
        }
    }, [isOpen, isMinimized]);

    const addWelcome = () => {
        const welcomeText =
            lang === 'hi'
                ? 'नमस्ते! 🙏 मैं **Gemini AI** से संचालित आपका सहायक हूं। आप मुझसे कोई भी सवाल पूछ सकते हैं — स्वास्थ्य, आपातकाल, सामान्य ज्ञान, या कुंभ मेला जानकारी!'
                : lang === 'mr'
                    ? 'नमस्ते! 🙏 मी **Gemini AI** द्वारे चालवलेला सहाय्यक आहे. आरोग्य, आणीबाणी किंवा कुंभ मेळा माहितीसाठी मला विचारा!'
                    : 'Namaste! 🙏 I\'m your **AI Assistant** powered by **Gemini AI**.\nAsk me *anything* — medical emergencies, health tips, general knowledge, or Kumbh Mela info!';

        setMessages([{
            id: 'welcome',
            text: welcomeText,
            sender: 'bot',
            timestamp: new Date(),
        }]);
    };

    const handleSend = useCallback(async (text?: string) => {
        const userInput = (text ?? inputText).trim();
        if (!userInput || isLoading) return;

        const userMsg: Message = {
            id: `${Date.now()}-user`,
            text: userInput,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setShowSuggestions(false);
        setIsLoading(true);

        // Reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = '24px';

        // Placeholder bot message (typing dots)
        const botId = `${Date.now()}-bot`;
        setMessages(prev => [...prev, {
            id: botId,
            text: '',
            sender: 'bot',
            timestamp: new Date(),
            streaming: true,
        }]);

        historyRef.current.push({ role: 'user', content: userInput });

        try {
            const res = await fetch(`${API_BASE}/chatbot/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userInput,
                    language: lang,
                    history: historyRef.current.slice(-10),
                }),
            });

            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            const fullText: string = data.response ?? 'No response received.';

            historyRef.current.push({ role: 'assistant', content: fullText });

            // Simulate streaming word-by-word
            await streamText(
                fullText,
                (partial) => {
                    setMessages(prev =>
                        prev.map(m => m.id === botId ? { ...m, text: partial, streaming: true } : m)
                    );
                },
                () => {
                    setMessages(prev =>
                        prev.map(m => m.id === botId ? { ...m, text: fullText, streaming: false } : m)
                    );
                }
            );
        } catch (err) {
            console.error('Chatbot error:', err);
            const errMsg =
                lang === 'hi'
                    ? '⚠️ सर्वर से जुड़ने में समस्या हुई। कृपया सुनिश्चित करें कि बैकएंड सर्वर चल रहा है (`npm run dev:server`)।'
                    : lang === 'mr'
                        ? '⚠️ सर्व्हरशी कनेक्ट होण्यात समस्या. कृपया बॅकएंड सर्व्हर सुरू करा.'
                        : '⚠️ Couldn\'t reach the AI server. Make sure the backend is running:\n`npm run dev:server`';

            setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, text: errMsg, streaming: false } : m)
            );
            historyRef.current.pop();
        } finally {
            setIsLoading(false);
        }
    }, [inputText, isLoading, lang]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
        historyRef.current = [];
        setShowSuggestions(true);
        setTimeout(addWelcome, 50);
    };

    const label = lang === 'hi' ? 'AI सहायक' : lang === 'mr' ? 'AI सहाय्यक' : 'AI Assistant';
    const placeholder =
        lang === 'hi' ? 'कुछ भी पूछें... (Shift+Enter नई लाइन)' :
        lang === 'mr' ? 'काहीही विचारा...' :
        'Ask anything... (Shift+Enter for new line)';

    return (
        <>
            <style>{`
                @keyframes chatBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                @keyframes chatSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
                .chat-window  { animation: chatSlideUp 0.25s ease-out; }
                .chat-message { animation: chatSlideUp 0.18s ease-out; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* ── Floating button ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
                    aria-label="Open AI chatbot"
                >
                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                </button>
            )}

            {/* ── Chat window ── */}
            {isOpen && (
                <div
                    className={`chat-window fixed bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[640px]'}`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-700" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-semibold text-sm">{label}</h3>
                                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5" /> Gemini
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/70">
                                    {isLoading
                                        ? (lang === 'hi' ? 'टाइप कर रहा है...' : 'Typing...')
                                        : (lang === 'hi' ? 'ऑनलाइन • सदा मदद के लिए' : 'Online • Always ready')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={clearChat} title="Clear chat"
                                className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsMinimized(m => !m)}
                                className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                            </button>
                            <button onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                                className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
                                {messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`chat-message flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.sender === 'bot' && (
                                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        <div className={`group relative max-w-[82%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'}`}
                                            >
                                                {msg.sender === 'bot' ? (
                                                    msg.streaming && msg.text === '' ? (
                                                        <TypingDots />
                                                    ) : (
                                                        <>
                                                            <div
                                                                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                                                            />
                                                            {msg.streaming && (
                                                                <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                                                            )}
                                                        </>
                                                    )
                                                ) : (
                                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                )}
                                            </div>

                                            <div className={`flex items-center gap-1 mt-1 px-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-[10px] text-gray-400">
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.sender === 'bot' && !msg.streaming && (
                                                    <CopyButton text={msg.text} />
                                                )}
                                            </div>
                                        </div>

                                        {msg.sender === 'user' && (
                                            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                <User className="w-4 h-4 text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick suggestions */}
                            {showSuggestions && messages.length <= 1 && (
                                <div className="px-3 pb-2 bg-white border-t border-gray-100">
                                    <p className="text-[10px] text-gray-400 mb-1.5 pt-2">💡 Quick questions</p>
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                        {quickQuestions.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSend(q.text)}
                                                className="whitespace-nowrap bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors flex-shrink-0"
                                            >
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                                <div className="flex gap-2 items-end bg-gray-50 rounded-xl border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-2">
                                    <textarea
                                        ref={inputRef}
                                        rows={1}
                                        value={inputText}
                                        onChange={e => {
                                            setInputText(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder={placeholder}
                                        className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed max-h-28"
                                        disabled={isLoading}
                                        style={{ height: '24px' }}
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!inputText.trim() || isLoading}
                                        className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0 shadow-sm"
                                        aria-label="Send"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                                    Powered by Gemini AI • For emergencies call <strong>108</strong>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
