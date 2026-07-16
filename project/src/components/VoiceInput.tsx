import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, AlertCircle, X, Check, Edit3, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

// ─── English STT post-processor ──────────────────────────────────────────────
// Fixes common speech-to-text transcription errors for English
function normalizeSpeechText(text: string, lang: string): string {
  if (!text) return text;
  let t = text.trim();

  // Only apply English-specific fixes for English language
  if (lang.startsWith('en')) {
    // Fix number words → digits (common STT substitution errors)
    const numberWords: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100',
    };
    // Replace standalone number words in numeric contexts (age, height, weight, phone)
    t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi,
      (m) => numberWords[m.toLowerCase()] || m
    );

    // Fix blood group letter phonetic mishearings
    t = t.replace(/\b(hey|aay|aye)\s*(positive|negative|pos|neg|\+|-)\b/gi, 'A $2');
    t = t.replace(/\b(bee|be)\s*(positive|negative|pos|neg|\+|-)\b/gi, 'B $2');
    t = t.replace(/\b(oh|ow|0)\s*(positive|negative|pos|neg|\+|-)\b/gi, 'O $2');
    t = t.replace(/\b(ab|a b)\s*(positive|negative|pos|neg|\+|-)\b/gi, 'AB $2');

    // Fix gender mishearings: "mail" is phonetically identical to "male"
    t = t.replace(/(?<![-@\w])(mail)(?!\s*\w*[@\.])\b/gi, 'male');
    t = t.replace(/\b(fee\s*mail|fee\s*male|feemail|femail)\b/gi, 'female');

    // Fix "positive" / "negative" shorthand heard as single words
    t = t.replace(/\bpositive\b/gi, 'positive');
    t = t.replace(/\bnegative\b/gi, 'negative');

    // Remove filler words that commonly pollute STT output
    t = t.replace(/\b(um+|uh+|er+|ah+|hmm+|like i said|you know|i mean)\b[,]?\s*/gi, ' ');

    // Fix 'and' between digits that forms phone numbers (e.g. "nine eight seven and six" → "987 6")
    t = t.replace(/(\d)\s+and\s+(\d)/gi, '$1$2');

    // Normalize spacing around punctuation
    t = t.replace(/\s+([,.!?])\s*/g, '$1 ');
  }

  // Universal: collapse multiple spaces
  t = t.replace(/\s{2,}/g, ' ').trim();

  // Capitalize first letter
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);

  return t;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: any) => void;
    onerror:  (event: any) => void;
    onend:    () => void;
    onstart:  () => void;
}

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    language?: string;
    className?: string;
}

// listening → heard → confirm/edit → done
// listening → no-speech / error
type Phase = 'opening' | 'listening' | 'confirm' | 'done' | 'no-speech' | 'error';

// ─── Inject CSS once ──────────────────────────────────────────────────────────
function injectStyles() {
    if (document.getElementById('gva-styles')) return;
    const s = document.createElement('style');
    s.id = 'gva-styles';
    s.textContent = `
        @keyframes gva-ring {
            0%   { transform: scale(0.7); opacity: 0.6; }
            100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes gva-bar {
            0%, 100% { transform: scaleY(0.12); }
            50%      { transform: scaleY(1); }
        }
        @keyframes gva-pulse {
            0%, 100% { box-shadow: 0 0 0 0   rgba(66,133,244,0.5); }
            50%       { box-shadow: 0 0 0 16px rgba(66,133,244,0); }
        }
        @keyframes gva-up {
            from { transform: translateY(48px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes gva-pop {
            0%  { transform: scale(0.2); opacity: 0; }
            70% { transform: scale(1.2); opacity: 1; }
            100%{ transform: scale(1);   opacity: 1; }
        }
        @keyframes gva-fade-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gva-overlay-in { from { opacity:0 } to { opacity:1 } }

        .gva-card       { animation: gva-up         0.34s cubic-bezier(0.34,1.56,0.64,1) both; }
        .gva-overlay    { animation: gva-overlay-in 0.22s ease both; }
        .gva-pop        { animation: gva-pop        0.4s  cubic-bezier(0.34,1.56,0.64,1) both; }
        .gva-confirm-in { animation: gva-fade-in    0.28s ease both; }

        .gva-edit-input {
            width: 100%;
            border: none;
            border-bottom: 2px solid #4285F4;
            outline: none;
            font-size: 20px;
            color: #202124;
            background: transparent;
            text-align: center;
            padding: 4px 0 6px;
            font-family: 'Google Sans', Roboto, sans-serif;
            caret-color: #4285F4;
        }
        .gva-edit-input::placeholder { color: #bdc1c6; }
    `;
    document.head.appendChild(s);
}

// ─── Wave bars ────────────────────────────────────────────────────────────────
const BAR_COLORS  = ['#4285F4','#EA4335','#FBBC05','#34A853'];
const BAR_HEIGHTS = [
    [0.30,0.80,0.50,1.00,0.60,0.90,0.40],
    [0.70,0.30,0.90,0.40,0.80,0.50,0.70],
    [0.50,0.90,0.30,0.70,1.00,0.40,0.60],
    [0.90,0.50,0.70,0.30,0.60,1.00,0.50],
];

function WaveBars({ active }: { active: boolean }) {
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, height:44 }}>
            {BAR_COLORS.map((color, ci) =>
                BAR_HEIGHTS[ci].map((h, bi) => (
                    <span key={`${ci}-${bi}`} style={{
                        display:         'inline-block',
                        width:           4,
                        height:          '100%',
                        backgroundColor: color,
                        borderRadius:    3,
                        transformOrigin: 'bottom',
                        transform:       active ? `scaleY(${h})` : 'scaleY(0.1)',
                        transition:      active ? 'none' : 'transform 0.4s ease',
                        animation:       active ? `gva-bar ${650 + bi*80}ms ${(ci*7+bi)*55}ms infinite ease-in-out` : 'none',
                    }} />
                ))
            )}
        </div>
    );
}

// ─── Ripple rings ─────────────────────────────────────────────────────────────
function Ripples({ active }: { active: boolean }) {
    if (!active) return null;
    return (
        <>
            {[0,1,2].map(i => (
                <span key={i} style={{
                    position:'absolute', borderRadius:'50%',
                    border:`2px solid #4285F4`, width:72, height:72,
                    opacity:0, pointerEvents:'none',
                    animation:`gva-ring 1.8s ${i*0.6}s infinite ease-out`,
                }} />
            ))}
        </>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function VoiceInput({ onTranscript, language = 'en-US', className = '' }: VoiceInputProps) {
    const { t } = useI18n();

    const [open,       setOpen]      = useState(false);
    const [phase,      setPhase]     = useState<Phase>('opening');
    const [interim,    setInterim]   = useState('');
    const [recognized, setRecognized]= useState('');   // raw from speech engine
    const [edited,     setEdited]    = useState('');   // user may fix this
    const [errMsg,     setErrMsg]    = useState('');
    const [retries,    setRetries]   = useState(0);

    const recRef    = useRef<SpeechRecognition | null>(null);
    const finalRef  = useRef('');
    const editRef   = useRef<HTMLInputElement>(null);
    const MAX_RET   = 2;

    useEffect(() => { injectStyles(); }, []);

    // ── Build recognition ──────────────────────────────────────────────────────
    const buildRec = useCallback((): SpeechRecognition | null => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return null;
        // @ts-ignore
        const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR() as SpeechRecognition;
        rec.continuous      = false;   // auto-stops on silence (Google style)
        rec.interimResults  = true;
        // Use explicit en-US for English — more accurate than generic 'en'
        rec.lang            = language === 'en' ? 'en-US' : language;
        rec.maxAlternatives = 5;  // Increased from 3 → more candidates for best-pick
        return rec;
    }, [language]);

    // ── Start a session ────────────────────────────────────────────────────────
    const startSession = useCallback((retryN: number) => {
        const rec = buildRec();
        if (!rec) { setErrMsg('Speech recognition not supported.'); setPhase('error'); return; }

        finalRef.current = '';
        setInterim('');
        setPhase('listening');
        recRef.current = rec;

        rec.onstart = () => setPhase('listening');

        rec.onresult = (e: any) => {
            let im = '';
            // Adaptive confidence threshold: higher for English (cleaner signal)
            const confThreshold = language.startsWith('en') ? 0.45 : 0.3;
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    let best = e.results[i][0].transcript;
                    let bestConf = e.results[i][0].confidence ?? 0;
                    for (let j = 1; j < e.results[i].length; j++) {
                        const a = e.results[i][j];
                        if ((a.confidence ?? 0) > bestConf) { bestConf = a.confidence; best = a.transcript; }
                    }
                    // Accept if: confidence unreported (browser doesn't report it) OR above threshold
                    if (bestConf === 0 || bestConf >= confThreshold) {
                        finalRef.current += normalizeSpeechText(best, language);
                    }
                } else {
                    im += e.results[i][0].transcript;
                }
            }
            setInterim(im);
        };

        rec.onerror = (e: any) => {
            if (e.error === 'aborted') return;
            setPhase(prev => {
                if (prev === 'confirm' || prev === 'done') return prev; // don't override confirm phase
                return prev;
            });
            if (e.error === 'no-speech') {
                if (retryN < MAX_RET) {
                    setRetries(retryN + 1);
                    setTimeout(() => startSession(retryN + 1), 300);
                } else { setPhase('no-speech'); }
                return;
            }
            if (e.error === 'not-allowed') { setErrMsg(t('common.voiceMicDenied')); setPhase('error'); return; }
            if (e.error === 'network')     { setErrMsg(t('common.voiceNetworkError')); setPhase('error'); return; }
            setErrMsg('Error: ' + e.error); setPhase('error');
        };

        // ── onend → show CONFIRM/EDIT phase instead of auto-committing ─────────
        rec.onend = () => {
            setInterim('');
            const text = finalRef.current.trim();
            if (text) {
                // Show confirm phase with editable text
                setRecognized(text);
                setEdited(text);
                setPhase('confirm');
                // Auto-focus the edit input
                setTimeout(() => editRef.current?.focus(), 80);
            } else if (retryN < MAX_RET) {
                setRetries(retryN + 1);
                setTimeout(() => startSession(retryN + 1), 300);
            } else {
                setPhase('no-speech');
            }
        };

        try { rec.start(); }
        catch { setErrMsg('Could not start microphone.'); setPhase('error'); }
    }, [buildRec, t]); // eslint-disable-line

    // ── Commit (user confirmed / edited text) ──────────────────────────────────
    const commit = () => {
        const text = edited.trim();
        if (!text) return;
        onTranscript(text);
        setPhase('done');
        setTimeout(() => closeModal(), 900);
    };

    // ── Open → auto-start ─────────────────────────────────────────────────────
    const openModal = () => {
        setOpen(true);
        setPhase('opening');
        setInterim('');
        setRecognized('');
        setEdited('');
        setErrMsg('');
        setRetries(0);
        finalRef.current = '';
        setTimeout(() => startSession(0), 340);
    };

    // ── Close ─────────────────────────────────────────────────────────────────
    const closeModal = () => {
        try { recRef.current?.abort(); } catch (_) {}
        recRef.current = null;
        setOpen(false);
        setPhase('opening');
        setInterim('');
        setRecognized('');
        setEdited('');
        setErrMsg('');
        setRetries(0);
        finalRef.current = '';
    };

    // ── Retry ─────────────────────────────────────────────────────────────────
    const retryNow = () => {
        setRecognized('');
        setEdited('');
        setInterim('');
        setErrMsg('');
        setRetries(0);
        finalRef.current = '';
        startSession(0);
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const isListening = phase === 'listening';
    const isConfirm   = phase === 'confirm';
    const isDone      = phase === 'done';
    const isNoSpeech  = phase === 'no-speech';
    const isError     = phase === 'error';

    const micBg =
        isDone      ? 'linear-gradient(135deg,#34A853,#27a049)' :
        isNoSpeech || isError ? 'linear-gradient(135deg,#EA4335,#c53929)' :
        isConfirm   ? 'linear-gradient(135deg,#FBBC05,#f9a825)' :
                      'linear-gradient(135deg,#4285F4,#1a73e8)';

    return (
        <>
            {/* ── Trigger button ── */}
            <button
                type="button"
                id="voice-input-trigger"
                onClick={openModal}
                title={t('common.startVoice')}
                className={`relative p-2.5 rounded-full text-white shadow-md hover:scale-110 active:scale-95 transition-all duration-200 ${className}`}
                style={{ background:'linear-gradient(135deg,#4285F4,#1a73e8)', boxShadow:'0 3px 14px rgba(66,133,244,0.4)' }}
            >
                <Mic className="w-5 h-5" />
            </button>

            {/* ── Modal ── */}
            {open && (
                <div
                    className="gva-overlay fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
                    style={{ background:'rgba(0,0,0,0.52)', backdropFilter:'blur(6px)' }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div
                        className="gva-card w-full sm:w-[390px] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden"
                        style={{ background:'#fff', boxShadow:'0 28px 90px rgba(0,0,0,0.25)' }}
                    >
                        {/* Header */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 6px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                {BAR_COLORS.map((c,i) => (
                                    <span key={i} style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }} />
                                ))}
                                <span style={{ fontSize:13, color:'#5f6368', fontWeight:500, marginLeft:4, fontFamily:'Roboto,sans-serif' }}>
                                    Google Voice Input
                                </span>
                            </div>
                            <button
                                type="button" onClick={closeModal}
                                style={{ padding:6, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', color:'#80868b', display:'flex', lineHeight:1 }}
                                onMouseEnter={e => (e.currentTarget.style.background='#f1f3f4')}
                                onMouseLeave={e => (e.currentTarget.style.background='none')}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* ── CONFIRM / EDIT phase ────────────────────────────────────── */}
                        {isConfirm && (
                            <div className="gva-confirm-in" style={{ padding:'12px 28px 6px' }}>
                                {/* Hint */}
                                <p style={{ fontSize:11, color:'#80868b', margin:'0 0 8px', textAlign:'center', fontFamily:'Roboto,sans-serif' }}>
                                    <Edit3 size={11} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }} />
                                    Tap to correct if misheard
                                </p>
                                {/* Editable text — looks like Google Keyboard's voice result */}
                                <input
                                    ref={editRef}
                                    className="gva-edit-input"
                                    value={edited}
                                    onChange={e => setEdited(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); }}}
                                    placeholder="Edit if needed…"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {/* Show diff hint if it was changed */}
                                {edited !== recognized && recognized && (
                                    <p style={{ fontSize:10, color:'#bdc1c6', textAlign:'center', margin:'4px 0 0', fontFamily:'Roboto,sans-serif' }}>
                                        Heard: "{recognized}"
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── Transcript / status area (non-confirm phases) ─────────── */}
                        {!isConfirm && (
                            <div style={{ minHeight:78, padding:'10px 28px 4px', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
                                {isDone ? (
                                    <p style={{ fontSize:20, color:'#34A853', fontWeight:500, margin:0, fontFamily:'Roboto,sans-serif' }}>
                                        ✓ {edited || recognized}
                                    </p>
                                ) : interim ? (
                                    <p style={{ fontSize:20, color:'#80868b', fontStyle:'italic', margin:0, lineHeight:1.4, fontFamily:'Roboto,sans-serif' }}>
                                        {interim}
                                    </p>
                                ) : isListening ? (
                                    <p style={{ fontSize:15, color:'#80868b', margin:0, fontFamily:'Roboto,sans-serif' }}>
                                        {retries > 0 ? "Didn't catch that, listening again…" : 'Listening…'}
                                    </p>
                                ) : isNoSpeech ? (
                                    <p style={{ fontSize:15, color:'#80868b', margin:0, fontFamily:'Roboto,sans-serif' }}>
                                        Didn't catch that.{' '}
                                        <span style={{ color:'#4285F4', cursor:'pointer', fontWeight:500 }} onClick={retryNow}>Try again?</span>
                                    </p>
                                ) : isError ? (
                                    <div style={{ display:'flex', alignItems:'center', gap:8, color:'#EA4335', fontSize:14 }}>
                                        <AlertCircle size={15} /><span style={{ fontFamily:'Roboto,sans-serif' }}>{errMsg}</span>
                                    </div>
                                ) : (
                                    <p style={{ fontSize:15, color:'#bdc1c6', margin:0, fontFamily:'Roboto,sans-serif' }}>Starting…</p>
                                )}
                            </div>
                        )}

                        {/* Wave bars — only while listening */}
                        <div style={{ padding:'6px 0 2px', opacity: isListening ? 1 : 0.15, transition:'opacity 0.4s' }}>
                            <WaveBars active={isListening} />
                        </div>

                        {/* Mic + ripples */}
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'6px 0 8px' }}>
                            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <Ripples active={isListening} />
                                <button
                                    type="button"
                                    id="gva-mic-center"
                                    onClick={
                                        isListening   ? () => recRef.current?.stop() :
                                        isNoSpeech || isError ? retryNow :
                                        isConfirm     ? commit :
                                        undefined
                                    }
                                    style={{
                                        width:60, height:60, borderRadius:'50%',
                                        background: micBg,
                                        boxShadow: isListening ? undefined : '0 4px 18px rgba(66,133,244,0.45)',
                                        animation: isListening ? 'gva-pulse 1.4s infinite' : 'none',
                                        border:'none', cursor:'pointer', display:'flex',
                                        alignItems:'center', justifyContent:'center',
                                        position:'relative', zIndex:1,
                                        transition:'background 0.3s ease',
                                    }}
                                >
                                    {isDone
                                        ? <Check size={26} color="#fff" className="gva-pop" strokeWidth={3} />
                                        : isConfirm
                                        ? <Check size={26} color="#fff" strokeWidth={3} />
                                        : <Mic   size={26} color="#fff" />
                                    }
                                </button>
                            </div>
                            <p style={{ fontSize:12, color:'#bdc1c6', margin:0, fontFamily:'Roboto,sans-serif' }}>
                                {isListening  ? 'Tap mic to stop'  :
                                 isConfirm    ? 'Tap ✓ or press Enter to confirm' :
                                 isDone       ? '✓ Applied'        :
                                 isNoSpeech   ? 'No speech heard'  :
                                 isError      ? 'Error'            : 'Starting…'}
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div style={{ padding:'4px 24px 22px', display:'flex', gap:12 }}>
                            {isConfirm ? (
                                <>
                                    {/* Retry */}
                                    <button
                                        type="button"
                                        onClick={retryNow}
                                        title="Speak again"
                                        style={{ width:44, height:44, borderRadius:'50%', border:'1.5px solid #dadce0', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#5f6368', flexShrink:0 }}
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                    {/* Cancel */}
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        style={{ flex:1, padding:'11px 0', borderRadius:99, border:'1.5px solid #dadce0', background:'none', color:'#5f6368', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Roboto,sans-serif' }}
                                    >
                                        Cancel
                                    </button>
                                    {/* Use This */}
                                    <button
                                        type="button"
                                        id="gva-use-this"
                                        onClick={commit}
                                        disabled={!edited.trim()}
                                        style={{ flex:2, padding:'11px 0', borderRadius:99, border:'none', background:'linear-gradient(135deg,#4285F4,#1a73e8)', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', boxShadow:'0 2px 10px rgba(66,133,244,0.4)', fontFamily:'Roboto,sans-serif', opacity: edited.trim() ? 1 : 0.5 }}
                                    >
                                        Use This
                                    </button>
                                </>
                            ) : (isNoSpeech || isError) ? (
                                <>
                                    <button
                                        type="button" onClick={closeModal}
                                        style={{ flex:1, padding:'11px 0', borderRadius:99, border:'1.5px solid #dadce0', background:'none', color:'#5f6368', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Roboto,sans-serif' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button" onClick={retryNow}
                                        style={{ flex:1, padding:'11px 0', borderRadius:99, border:'none', background:'linear-gradient(135deg,#4285F4,#1a73e8)', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', boxShadow:'0 2px 10px rgba(66,133,244,0.4)', fontFamily:'Roboto,sans-serif' }}
                                    >
                                        Try Again
                                    </button>
                                </>
                            ) : (
                                <p style={{ width:'100%', textAlign:'center', fontSize:12, color:'#bdc1c6', margin:0, fontFamily:'Roboto,sans-serif' }}>
                                    {isListening ? 'Speak now…' : isDone ? 'Text applied to field' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
