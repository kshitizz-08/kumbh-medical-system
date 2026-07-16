import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mic, MicOff, SkipForward, CheckCircle2, Bot, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { AutoFillResult } from '../lib/geminiAutoFill';
import { useI18n } from '../i18n/i18n';

// ─── English STT normalizer ─────────────────────────────────────────────────────
function normalizeSpeechText(text: string, lang: string): string {
  if (!text) return text;
  let t = text.trim();
  if (lang.startsWith('en')) {
    const numberWords: Record<string, string> = {
      'zero':'0','one':'1','two':'2','three':'3','four':'4','five':'5',
      'six':'6','seven':'7','eight':'8','nine':'9','ten':'10','eleven':'11',
      'twelve':'12','thirteen':'13','fourteen':'14','fifteen':'15',
      'sixteen':'16','seventeen':'17','eighteen':'18','nineteen':'19',
      'twenty':'20','thirty':'30','forty':'40','fifty':'50',
      'sixty':'60','seventy':'70','eighty':'80','ninety':'90','hundred':'100',
    };
    t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi,
      (m) => numberWords[m.toLowerCase()] || m
    );
    // Blood group phonetic corrections
    t = t.replace(/\b(hey|aay|aye)\s*(positive|negative|pos|neg|plus|minus)\b/gi, 'A $2');
    t = t.replace(/\b(bee|be)\s*(positive|negative|pos|neg|plus|minus)\b/gi, 'B $2');
    t = t.replace(/\b(oh|ow)\s*(positive|negative|pos|neg|plus|minus)\b/gi, 'O $2');
    // Fix common gender mishearings: "mail" sounds identical to "male" for STT
    // Only correct when NOT preceded by "e-" or "@" (to avoid fixing actual email addresses)
    t = t.replace(/(?<![-@\w])(mail)(?!\s*\w*[@\.])\b/gi, 'male');
    // "fee mail" / "fee male" → "female"
    t = t.replace(/\b(fee\s*mail|fee\s*male|feemail|femail)\b/gi, 'female');
    // Filler word removal
    t = t.replace(/\b(um+|uh+|er+|ah+|hmm+|like i said|you know|i mean)\b[,]?\s*/gi, ' ');
    // Join digits split by 'and'
    t = t.replace(/(\d)\s+and\s+(\d)/gi, '$1$2');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

type Language = 'en' | 'hi' | 'mr';
type Field = keyof AutoFillResult;

interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: (e: any) => void; onerror: (e: any) => void;
  onend: () => void; onstart: () => void;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  field?: Field;
  isTyping?: boolean;
}

interface Step {
  field: Field;
  question: Record<Language, string>;
  hint: Record<Language, string>;
  extract: (text: string) => any;
  optional?: boolean;
  inputType?: 'text' | 'number' | 'tel';
}

const STEPS: Step[] = [
  {
    field: 'full_name',
    question: {
      en: "Patient's **full name**?",
      hi: "मरीज का **पूरा नाम**?",
      mr: "रुग्णाचे **पूर्ण नाव**?",
    },
    hint: { en: 'Say: "Ramesh Sharma"', hi: 'बोलें: "रमेश शर्मा"', mr: 'बोला: "रमेश शर्मा"' },
    extract: (text) => {
      let name = text.replace(/^(my name is|i am|naam|mera naam|maza nav|naam hai|patient|is|mera|maza)\s+/i, '').trim();
      name = name.replace(/\s+(hai|aahe|ahe|is)$/i, '').trim();
      return name;
    },
  },
  {
    field: 'age',
    question: {
      en: "**Age**?",
      hi: "**उम्र**?",
      mr: "**वय**?",
    },
    hint: { en: '"55"', hi: '"55"', mr: '"55"' },
    extract: (text) => {
      const m = text.match(/\b(\d{1,3})\b/);
      return m ? parseInt(m[1]) : undefined;
    },
    inputType: 'number',
  },
  {
    field: 'gender',
    question: {
      en: "**Gender**: Male, Female, or Other?",
      hi: "**लिंग**: पुरुष, महिला, या अन्य?",
      mr: "**लिंग**: पुरुष, स्त्री, किंवा इतर?",
    },
    hint: { en: '"Male"', hi: '"पुरुष"', mr: '"पुरुष"' },
    extract: (text) => {
      const tl = text.toLowerCase();
      // Note: "mail" is a very common STT mishearing of "male" — include it explicitly
      if (/\b(female|woman|lady|mahila|aurat|stri|fee\s*m[ae][il]l?|fem)\b|स्त्री|महिला/i.test(tl)) return 'Female';
      if (/\b(male|mail|man|purush|gents|boys?|m[ae][il]l?)\b|पुरुष/i.test(tl)) return 'Male';
      if (/\b(other|anya)\b|अन्य|इतर/i.test(tl)) return 'Other';
      return undefined;
    },
  },
  {
    field: 'height_cm',
    question: {
      en: "**Height** in centimeters?",
      hi: "**ऊंचाई** सेंटीमीटर में?",
      mr: "**उंची** सेंटीमीटरमध्ये?",
    },
    hint: { en: '"170"', hi: '"170"', mr: '"170"' },
    extract: (text) => {
      const m = text.match(/\b(\d{2,3})\b/);
      return m ? parseInt(m[1]) : undefined;
    },
    optional: true,
  },
  {
    field: 'weight_kg',
    question: {
      en: "**Weight** in kg?",
      hi: "**वजन** किलोग्राम में?",
      mr: "**वजन** किलोग्राममध्ये?",
    },
    hint: { en: '"65"', hi: '"65"', mr: '"65"' },
    extract: (text) => {
      const m = text.match(/\b(\d{2,3})\b/);
      return m ? parseInt(m[1]) : undefined;
    },
    optional: true,
  },
  {
    field: 'phone',
    question: {
      en: "**Phone number**?",
      hi: "**फोन नंबर**?",
      mr: "**फोन नंबर**?",
    },
    hint: { en: '"98765 43210"', hi: '"98765 43210"', mr: '"98765 43210"' },
    extract: (text) => {
      const digits = text.replace(/\D/g, '');
      return digits.length >= 7 ? digits.slice(0, 10) : undefined;
    },
    inputType: 'tel',
  },
  {
    field: 'blood_group',
    question: {
      en: "**Blood group**?",
      hi: "**ब्लड ग्रुप**?",
      mr: "**रक्तगट**?",
    },
    hint: { en: '"O positive"', hi: '"O positive"', mr: '"O positive"' },
    extract: (text) => {
      const tl = text.toLowerCase().replace(/\s+/g, '');
      const bgMap: [RegExp, string][] = [
        [/ab(positive|pos|\+|पॉझिटिव्ह|पॉजिटिव)/i, 'AB+'],
        [/ab(negative|neg|-|निगेटिव्ह|नेगेटिव)/i, 'AB-'],
        [/(a|ए)(positive|pos|\+|पॉझिटिव्ह|पॉजिटिव)/i, 'A+'],
        [/(a|ए)(negative|neg|-|निगेटिव्ह|नेगेटिव)/i, 'A-'],
        [/(b|बी)(positive|pos|\+|पॉझिटिव्ह|पॉजिटिव)/i, 'B+'],
        [/(b|बी)(negative|neg|-|निगेटिव्ह|नेगेटिव)/i, 'B-'],
        [/(o|ओ)(positive|pos|\+|पॉझिटिव्ह|पॉजिटिव)/i, 'O+'],
        [/(o|ओ)(negative|neg|-|निगेटिव्ह|नेगेटिव)/i, 'O-'],
      ];
      for (const [pat, g] of bgMap) if (pat.test(tl)) return g;
      return undefined;
    },
    optional: true,
  },
  {
    field: 'chronic_conditions',
    question: {
      en: "Any **medical conditions**? Say None if no.",
      hi: "कोई **पुरानी बीमारी**? नहीं है तो 'कोई नहीं' बोलें।",
      mr: "कोणता **जुनाट आजार**? नसेल तर 'काही नाही' बोला.",
    },
    hint: { en: '"Diabetes"', hi: '"मधुमेह"', mr: '"मधुमेह"' },
    extract: (text) => text.trim(),
    optional: true,
  },
  {
    field: 'allergies',
    question: {
      en: "Any **allergies**?",
      hi: "कोई **एलर्जी**?",
      mr: "कोणती **ऍलर्जी**?",
    },
    hint: { en: '"Dust"', hi: '"धूल"', mr: '"धूळ"' },
    extract: (text) => text.trim(),
    optional: true,
  },
  {
    field: 'current_medications',
    question: {
      en: "Current **medications**?",
      hi: "वर्तमान **दवाइयां**?",
      mr: "सध्याची **औषधे**?",
    },
    hint: { en: '"Metformin"', hi: '"Metformin"', mr: '"Metformin"' },
    extract: (text) => text.trim(),
    optional: true,
  },
  {
    field: 'past_surgeries',
    question: {
      en: "Past **surgeries**?",
      hi: "पुरानी **सर्जरी**?",
      mr: "पूर्वीची **शस्त्रक्रिया**?",
    },
    hint: { en: '"Knee surgery"', hi: '"घुटने की सर्जरी"', mr: '"गुडघ्याचे ऑपरेशन"' },
    extract: (text) => text.trim(),
    optional: true,
  },
  {
    field: 'emergency_contact_name',
    question: {
      en: "**Emergency contact** name?",
      hi: "**आपातकालीन संपर्क** का नाम?",
      mr: "**आपत्कालीन संपर्काचे** नाव?",
    },
    hint: { en: '"Suresh"', hi: '"सुरेश"', mr: '"सुरेश"' },
    extract: (text) => {
      let name = text.replace(/^(name is|naam|naam hai|is|mera|maza)\s+/i, '').trim();
      name = name.replace(/\s+(hai|aahe|ahe|is)$/i, '').trim();
      return name;
    },
    optional: true,
  },
  {
    field: 'emergency_contact_phone',
    question: {
      en: "Emergency **phone number**?",
      hi: "आपातकालीन **फ़ोन नंबर**?",
      mr: "आपत्कालीन **फोन नंबर**?",
    },
    hint: { en: '"87654 32109"', mr: '"87654 32109"', hi: '"87654 32109"' },
    extract: (text) => {
      const digits = text.replace(/\D/g, '');
      return digits.length >= 7 ? digits.slice(0, 10) : undefined;
    },
    optional: true,
    inputType: 'tel',
  },
  {
    field: 'special_notes',
    question: {
      en: "Special **medical notes**?",
      hi: "कोई विशेष **मेडिकल नोट्स**?",
      mr: "काही विशेष **वैद्यकीय नोंद**?",
    },
    hint: { en: '"Wheelchair user"', hi: '"व्हीलचेयर"', mr: '"व्हीलचेअर"' },
    extract: (text) => text.trim(),
    optional: true,
  },
];

const DONE_MESSAGES: Record<Language, string> = {
  en: "🎉 All done! The form has been filled based on your answers. Please review and submit!",
  hi: "🎉 सब हो गया! आपके जवाबों के आधार पर फॉर्म भर दिया गया है। कृपया जांचें और सबमिट करें!",
  mr: "🎉 सर्व झाले! तुमच्या उत्तरांच्या आधारे फॉर्म भरला आहे. कृपया तपासा आणि सबमिट करा!",
};

const CONFIRM_PREFIXES: Record<Language, string> = {
  en: "✅ Got it.",
  hi: "✅ ठीक है।",
  mr: "✅ ठीक आहे.",
};

const SKIP_MESSAGES: Record<Language, string> = {
  en: "⏭️ Skipped. Moving on…",
  hi: "⏭️ छोड़ा। आगे बढ़ते हैं…",
  mr: "⏭️ वगळले. पुढे जाऊया…",
};

interface ConversationalFillProps {
  onAutoFill: (data: AutoFillResult) => void;
  onClose: () => void;
  language?: string;
}

export default function ConversationalFill({ onAutoFill, onClose, language = 'en-US' }: ConversationalFillProps) {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stepIndex, _setStepIndex] = useState(0);
  const stepIndexRef = useRef(0);
  const setStepIndex = (val: number) => {
    stepIndexRef.current = val;
    _setStepIndex(val);
  };
  const [isListening, setIsListening] = useState(false);
  const [isTTSOn, setIsTTSOn] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [textInput, setTextInput] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef('');
  const hasStarted = useRef(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!isTTSOn || !window.speechSynthesis) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, '').replace(/\n/g, '. ');
    const utterance = new SpeechSynthesisUtterance(clean);
    // Set language code
    const targetLang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-US';
    utterance.lang = targetLang;
    
    // Explicitly try to find a matching voice, preferring high-quality Google/Microsoft voices
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => (v.lang === targetLang || v.lang.startsWith(lang)) && (v.name.includes('Google') || v.name.includes('Microsoft')));
    
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang === targetLang || v.lang.startsWith(lang));
    }
    
    // Fallbacks for Marathi if missing (Hindi voice reads Devanagari better than English voice)
    if (!selectedVoice && lang === 'mr') {
      selectedVoice = voices.find(v => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && (v.name.includes('Google') || v.name.includes('Microsoft')));
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1.0; // Normal speech speed
    utterance.pitch = 1.05;
    utterance.onend  = () => onDone?.();
    utterance.onerror = () => onDone?.();
    window.speechSynthesis.speak(utterance);
  }, [isTTSOn, lang]);

  const addAIMessage = useCallback((text: string, id?: string): string => {
    const msgId = id || `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: msgId, role: 'ai', text }]);
    scrollToBottom();
    return msgId;
  }, []);

  const addUserMessage = useCallback((text: string, field?: Field) => {
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', text, field }]);
    scrollToBottom();
  }, []);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    // Abort any in-flight recognition first
    try { recognitionRef.current?.abort(); } catch (_) {}
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR() as SpeechRecognition;
    recognition.continuous = false;   // Auto-stops after user pauses → instant submit
    recognition.interimResults = true;
    // Use explicit regional locales for maximum accuracy
    const srLang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-US';
    recognition.lang = srLang;
    recognition.maxAlternatives = lang === 'en' ? 5 : 3; // More alternatives for English
    finalTranscriptRef.current = '';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      let interim = '';
      // Higher threshold for English where STT is more accurate and confident
      const confThreshold = srLang.startsWith('en') ? 0.45 : 0.3;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          let bestTranscript = e.results[i][0].transcript;
          let bestConfidence = e.results[i][0].confidence || 0;
          for (let j = 1; j < e.results[i].length; j++) {
            const alt = e.results[i][j];
            if ((alt.confidence || 0) > bestConfidence) {
              bestConfidence = alt.confidence;
              bestTranscript = alt.transcript;
            }
          }
          if (bestConfidence === 0 || bestConfidence >= confThreshold) {
            finalTranscriptRef.current += normalizeSpeechText(bestTranscript, srLang);
          }
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };
    recognition.onerror = (e: any) => {
      if (e.error !== 'aborted') setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      if (finalTranscriptRef.current.trim()) {
        handleAnswer(finalTranscriptRef.current.trim());
      }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (_) {}
  }, [language]); // eslint-disable-line

  const stopListening = () => { recognitionRef.current?.stop(); };

  const askStep = useCallback((index: number) => {
    if (index >= STEPS.length) {
      setIsTypingAI(false);
      addAIMessage(DONE_MESSAGES[lang]);
      setIsDone(true);
      speak(DONE_MESSAGES[lang]);
      return;
    }
    const step = STEPS[index];
    const question = step.question[lang];
    addAIMessage(question);
    scrollToBottom();
    // Cancel any lingering TTS, speak the question, then start mic AFTER speaking finishes
    window.speechSynthesis?.cancel();
    speak(question, () => {
      // Start mic only after AI finishes speaking — prevents mic picking up TTS
      setTimeout(startListening, 200);
    });
  }, [lang, addAIMessage, speak, startListening]);

  // Initialize and load voices
  useEffect(() => {
    if (hasStarted.current) return;
    
    // Force voices to load on some browsers (Chrome/Edge)
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    hasStarted.current = true;
    askStep(0);
  }, []); // eslint-disable-line

  const handleAnswer = useCallback((text: string) => {
    const currentStepIndex = stepIndexRef.current;
    const step = STEPS[currentStepIndex];
    if (!step) return;

    const extracted = step.extract(text);
    const isNone = /\b(none|no|koi nahi|kahi nahi|nahin|nahi)\b|नहीं|नाही/i.test(text);

    addUserMessage(text, step.field);

    if (extracted !== undefined && extracted !== '') {
      onAutoFill({ [step.field]: extracted } as AutoFillResult);
      // Show brief confirm text then jump instantly to next question
      addAIMessage(`${CONFIRM_PREFIXES[lang]} **${extracted}**`);
      // No TTS on confirm — saves ~1-2 sec per step
      const next = currentStepIndex + 1;
      setStepIndex(next);
      // Small delay so confirm message renders before next question appears
      setTimeout(() => askStep(next), 120);
      
    } else if (isNone && step.optional) {
      addAIMessage(SKIP_MESSAGES[lang]);
      const next = currentStepIndex + 1;
      setStepIndex(next);
      setTimeout(() => askStep(next), 120);
      
    } else {
      // Regex failed to parse — show error and restart mic
      const errorMsg: Record<Language, string> = {
        en: "Sorry, I didn't catch that. Please provide a valid answer.",
        hi: "माफ़ करें, मैं समझ नहीं पाया। कृपया सही उत्तर दें।",
        mr: "क्षमस्व, मला समजले नाही. कृपया योग्य उत्तर द्या."
      };
      addAIMessage(errorMsg[lang]);
      // Speak error then restart mic automatically
      speak(errorMsg[lang], () => {
        setTimeout(startListening, 200);
      });
    }
  }, [stepIndex, lang, addAIMessage, addUserMessage, onAutoFill, askStep, speak, startListening]);

  const handleSkip = () => {
    if (isListening) stopListening();
    const skipMsg = SKIP_MESSAGES[lang];
    addAIMessage(skipMsg);
    const next = stepIndexRef.current + 1;
    setStepIndex(next);
    askStep(next);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    if (isListening) stopListening();
    
    handleAnswer(textInput.trim());
    setTextInput('');
  };

  const progress = isDone ? 100 : Math.round((stepIndex / STEPS.length) * 100);
  const currentStep = STEPS[stepIndex];

  // Render markdown bold (**text**)
  const renderText = (text: string) =>
    text.split('\n').map((line, li) => (
      <span key={li}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, pi) =>
          pi % 2 === 1 ? <strong key={pi} className="font-bold">{part}</strong> : part
        )}
        {li < text.split('\n').length - 1 && <br />}
      </span>
    ));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg h-[92dvh] sm:h-[80vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ background: 'linear-gradient(160deg, #0f0c29, #1a1038, #24243e)' }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/50">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">AI Medical Assistant</h2>
                <p className="text-purple-300 text-xs">
                  {isDone ? '✅ Interview complete' : `Step ${Math.min(stepIndex + 1, STEPS.length)} of ${STEPS.length}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setIsTTSOn(v => !v); window.speechSynthesis?.cancel(); }}
                className="p-2 rounded-full text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
                title={isTTSOn ? 'Mute AI voice' : 'Unmute AI voice'}
              >
                {isTTSOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => { window.speechSynthesis?.cancel(); recognitionRef.current?.abort(); onClose(); }}
                className="p-2 rounded-full text-purple-300 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Chat messages ── */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end animate-fade-in`}
            >
              {/* Avatar */}
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {/* Bubble */}
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                  msg.role === 'ai'
                    ? 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                    : 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-br-sm shadow-purple-900/50'
                }`}
              >
                {renderText(msg.text)}
              </div>
            </div>
          ))}

          {/* AI typing indicator */}
          {isTypingAI && (
            <div className="flex gap-2.5 items-end">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm border border-white/10">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interim speech preview */}
          {isListening && interimText && (
            <div className="flex flex-row-reverse gap-2.5 items-end">
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-purple-500/30 border border-purple-400/30 text-purple-200 text-sm italic">
                {interimText}…
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom controls ── */}
        {!isDone ? (
          <div className="flex-shrink-0 border-t border-white/10 px-4 py-3 space-y-2">
            {/* Hint */}
            {currentStep && (
              <p className="text-center text-purple-300/70 text-xs">
                💬 {currentStep.hint[lang]}
              </p>
            )}
            {/* Listening status banner */}
            {isListening && (
              <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-red-500/20 border border-red-400/30">
                <span className="flex gap-0.5 items-end h-3">
                  {[40, 80, 55, 95, 65].map((h, i) => (
                    <span key={i} className="w-1 bg-red-400 rounded-full animate-bounce"
                      style={{ height: `${h}%`, animationDelay: `${i * 130}ms` }} />
                  ))}
                </span>
                <span className="text-red-300 text-xs font-semibold">
                  {lang === 'mr' ? '🎤 ऐकत आहे...' : lang === 'hi' ? '🎤 सुन रहा हूँ...' : '🎤 Listening...'}
                </span>
                <span className="flex gap-0.5 items-end h-3">
                  {[65, 95, 55, 80, 40].map((h, i) => (
                    <span key={i} className="w-1 bg-red-400 rounded-full animate-bounce"
                      style={{ height: `${h}%`, animationDelay: `${i * 130}ms` }} />
                  ))}
                </span>
              </div>
            )}

            {/* Buttons row */}
            <div className="flex gap-2">
              {/* Skip */}
              {currentStep?.optional && !isListening && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-purple-300 hover:text-white hover:bg-white/10 transition-all border border-white/10 font-medium whitespace-nowrap"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
              )}

              {/* Main mic button */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-900/50'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>
                      {lang === 'mr' ? 'थांबवा' : lang === 'hi' ? 'रोकें' : 'Stop'}
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>
                      {lang === 'mr' ? 'बोलण्यासाठी टॅप करा' : lang === 'hi' ? 'बोलने के लिए टैप करें' : 'Tap to speak'}
                    </span>
                  </>
                )}
              </button>
            </div>
            
            {/* Text Input Row */}
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type={currentStep?.inputType || 'text'}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={currentStep?.inputType === 'number' ? 'Type number...' : 'Type answer...'}
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl transition-colors shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-shrink-0 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              Close & Review Form
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
