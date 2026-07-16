import { useState, useRef, useCallback, useEffect } from 'react';
import { MicOff, Sparkles, AlertCircle, CheckCircle, Loader2, Square } from 'lucide-react';
import { parseVoiceToFormData, AutoFillResult } from '../lib/geminiAutoFill';
import { useI18n } from '../i18n/i18n';

// ─── Shared English STT normalizer ────────────────────────────────────────────────
function normalizeSpeechText(text: string, lang: string): string {
  if (!text) return text;
  let t = text.trim();
  if (lang.startsWith('en')) {
    const numberWords: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100',
    };
    t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi,
      (m) => numberWords[m.toLowerCase()] || m
    );
    // Fix blood group letter phonetic mishearings
    t = t.replace(/\b(hey|aay|aye)\s*(positive|negative|pos|neg|plus|minus)\b/gi, 'A $2');
    t = t.replace(/\b(bee|be)\s*(positive|negative|pos|neg|plus|minus)\b/gi, 'B $2');
    t = t.replace(/\b(oh|ow)\s*(positive|negative|pos|neg|plus|minus)\b/gi, 'O $2');
    // Fix gender mishearings: "mail" is phonetically identical to "male"
    t = t.replace(/(?<![-@\w])(mail)(?!\s*\w*[@\.])\b/gi, 'male');
    t = t.replace(/\b(fee\s*mail|fee\s*male|feemail|femail)\b/gi, 'female');
    // Remove filler words
    t = t.replace(/\b(um+|uh+|er+|ah+|hmm+|like i said|you know|i mean)\b[,]?\s*/gi, ' ');
    // Join digits split by 'and'
    t = t.replace(/(\d)\s+and\s+(\d)/gi, '$1$2');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onstart: () => void;
}

interface VoiceAutoFillButtonProps {
  onAutoFill: (data: AutoFillResult) => void;
  language?: string;
}

type Status = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export default function VoiceAutoFillButton({
  onAutoFill,
  language = 'en-US',
}: VoiceAutoFillButtonProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');           // full running transcript shown to user
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [listeningSeconds, setListeningSeconds] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer while listening
  useEffect(() => {
    if (status === 'listening') {
      setListeningSeconds(0);
      timerRef.current = setInterval(() => setListeningSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setStatus('idle');
      setFeedbackMsg(t('voiceAI.noSpeech'));
      return;
    }

    setStatus('processing');
    setFeedbackMsg('');

    try {
      const result = await parseVoiceToFormData(transcript);
      const fieldsFound = Object.keys(result).length;

      if (fieldsFound === 0) {
        setStatus('error');
        setFeedbackMsg(t('voiceAI.noExtract'));
      } else {
        onAutoFill(result);
        setStatus('success');
        setFeedbackMsg(t('voiceAI.filledFields', { count: fieldsFound }));
        setTimeout(() => {
          setStatus('idle');
          setFeedbackMsg('');
          setFinalText('');
        }, 4000);
      }
    } catch (err: any) {
      console.error('[VoiceAutoFill] Error:', err);
      setStatus('error');
      setFeedbackMsg(t('voiceAI.aiFail'));
    }
  }, [onAutoFill, t]);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatus('error');
      setFeedbackMsg(t('voiceAI.noSupport'));
      return;
    }

    // @ts-ignore
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass() as SpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    // Always use explicit locale for better accuracy; 'en' alone is less accurate than 'en-US'
    recognition.lang = language === 'en' ? 'en-US' : language;
    recognition.maxAlternatives = 5; // More candidates → higher chance of accurate best-pick

    finalTranscriptRef.current = '';
    setFinalText('');
    setInterimText('');
    setFeedbackMsg('');

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      // Use higher threshold for English: STT is more reliable, noisy alternatives are rarer
      const confThreshold = recognition.lang.startsWith('en') ? 0.45 : 0.35;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          // Pick the highest-confidence alternative
          let bestTranscript = event.results[i][0].transcript;
          let bestConfidence = event.results[i][0].confidence || 0;
          for (let j = 1; j < event.results[i].length; j++) {
            const alt = event.results[i][j];
            if ((alt.confidence || 0) > bestConfidence) {
              bestConfidence = alt.confidence;
              bestTranscript = alt.transcript;
            }
          }
          // Accept if confidence is good or not reported (browser omits it on some platforms)
          if (bestConfidence === 0 || bestConfidence >= confThreshold) {
            const normalized = normalizeSpeechText(bestTranscript, recognition.lang);
            finalTranscriptRef.current += ' ' + normalized;
            setFinalText(finalTranscriptRef.current.trim());
          }
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech') {
        // Restart on no-speech so user gets another chance
        try { recognition.start(); } catch (_) { /* already running */ }
        return;
      }
      console.warn('[VoiceAutoFill] Recognition error:', event.error);
      // Don't stop on network/audio errors — just log and continue
      if (event.error === 'network') return;
      setStatus('error');
      setFeedbackMsg(t('voiceAI.micError') + event.error);
    };

    recognition.onend = async () => {
      setInterimText('');
      // Combine finalTranscriptRef with any remaining interim
      const transcript = finalTranscriptRef.current.trim();
      await processTranscript(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, processTranscript, t]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = () => {
    if (status === 'listening') {
      stopListening();
    } else if (status === 'idle' || status === 'success' || status === 'error') {
      startListening();
    }
  };

  const wordCount = finalText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full space-y-2">

      {/* ── Main button ── */}
      <button
        type="button"
        id="voice-autofill-btn"
        onClick={toggle}
        disabled={status === 'processing'}
        className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-base transition-all duration-200 transform active:scale-98 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 ${
          status === 'idle'       ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-purple-300/60 hover:-translate-y-0.5' :
          status === 'listening'  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-300/60' :
          status === 'processing' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg cursor-not-allowed opacity-90' :
          status === 'success'    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-300/60' :
                                    'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:-translate-y-0.5'
        }`}
      >
        {/* Icon */}
        {status === 'idle'       && <Sparkles className="w-5 h-5 flex-shrink-0" />}
        {status === 'listening'  && <MicOff className="w-5 h-5 flex-shrink-0" />}
        {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />}
        {status === 'success'    && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
        {status === 'error'      && <AlertCircle className="w-5 h-5 flex-shrink-0" />}

        {/* Label */}
        <span>
          {status === 'idle'       && t('voiceAI.btnIdle')}
          {status === 'listening'  && `${t('voiceAI.btnListening')} (${listeningSeconds}s)`}
          {status === 'processing' && t('voiceAI.btnProcessing')}
          {status === 'success'    && t('voiceAI.btnSuccess')}
          {status === 'error'      && t('voiceAI.btnError')}
        </span>

        {/* Animated bars when listening */}
        {status === 'listening' && (
          <span className="flex gap-0.5 items-end h-5 ml-1 flex-shrink-0">
            {[35, 70, 55, 90, 65, 80, 45].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-white rounded-full animate-bounce"
                style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        )}
      </button>

      {/* ── Listening state: running transcript box + Done button ── */}
      {status === 'listening' && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-red-100 border-b border-red-200">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-700">
                {wordCount > 0 ? `${wordCount} words captured` : 'Speak now — say everything in one go…'}
              </span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              Done
            </button>
          </div>

          {/* Transcript area */}
          <div className="px-3 py-2 min-h-[60px] max-h-36 overflow-y-auto">
            {finalText && (
              <p className="text-sm text-gray-700 leading-relaxed">{finalText}</p>
            )}
            {interimText && (
              <p className="text-sm text-gray-400 italic">{interimText}…</p>
            )}
            {!finalText && !interimText && (
              <p className="text-sm text-red-300 italic">Waiting for speech…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Processing: show what was captured ── */}
      {status === 'processing' && finalText && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-600 font-semibold mb-1">🤖 Analyzing {wordCount} words with AI…</p>
          <p className="text-xs text-amber-700 italic line-clamp-2">"{finalText}"</p>
        </div>
      )}

      {/* ── Feedback message ── */}
      {feedbackMsg && status !== 'listening' && status !== 'processing' && (
        <div className={`rounded-lg px-3 py-2 text-sm font-medium text-center ${
          status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          status === 'error'   ? 'bg-red-50 text-red-700 border border-red-200' :
                                 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {feedbackMsg}
        </div>
      )}

      {/* ── Hint: only when idle ── */}
      {status === 'idle' && !feedbackMsg && (
        <p className="text-xs text-center text-gray-400 leading-relaxed">
          {t('voiceAI.hint')}
        </p>
      )}
    </div>
  );
}
