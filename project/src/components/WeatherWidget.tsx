import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, AlertTriangle, Thermometer, Loader2, X, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

type WeatherData = {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    description: string;
    icon: string;
    windSpeed: number;
    windDeg: number;
    visibility: number;
    clouds: number;
    uvIndex: number;
    aqi: number;
    location: string;
    cached?: boolean;
};

const AQI_LABELS = {
    en: ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'],
    hi: ['अच्छा', 'साधारण', 'मध्यम', 'खराब', 'बहुत खराब'],
    mr: ['चांगला', 'साधारण', 'मध्यम', 'वाईट', 'अतिशय वाईट']
};

const AQI_COLORS = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500'];
const AQI_BADGE_COLORS = ['text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-purple-400'];

const UV_LABELS = {
    en: ['Low', 'Low', 'Moderate', 'Moderate', 'High', 'High', 'Very High', 'Very High', 'Extreme', 'Extreme', 'Extreme'],
    hi: ['कम', 'कम', 'मध्यम', 'मध्यम', 'उच्च', 'उच्च', 'बहुत उच्च', 'बहुत उच्च', 'गंभीर', 'गंभीर', 'गंभीर'],
    mr: ['कमी', 'कमी', 'मध्यम', 'मध्यम', 'उच्च', 'उच्च', 'अतिउच्च', 'अतिउच्च', 'अत्यंत', 'अत्यंत', 'अत्यंत']
};

const UV_COLORS = [
    'bg-green-500', 'bg-green-500', 'bg-yellow-500', 'bg-yellow-500',
    'bg-orange-500', 'bg-orange-500', 'bg-red-500', 'bg-red-500',
    'bg-purple-500', 'bg-purple-500', 'bg-purple-500'
];

function getHeatRiskLevel(temp: number, humidity: number) {
    const heatIndex = temp + (humidity > 40 ? (humidity - 40) * 0.1 : 0);
    if (heatIndex >= 42) return { level: 'extreme', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40' };
    if (heatIndex >= 38) return { level: 'high', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' };
    if (heatIndex >= 33) return { level: 'moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' };
    return { level: 'low', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40' };
}

// ── Compact badge shown in the header ─────────────────────────────────────────
export function WeatherBadge() {
    const { lang } = useI18n();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const fetchWeather = async () => {
        try {
            const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
            const res = await fetch(`${API_BASE}/weather/current`);
            if (!res.ok) throw new Error('Failed');
            setWeather(await res.json());
        } catch {
            // silently fail — badge just won't show
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
        const iv = setInterval(fetchWeather, 5 * 60 * 1000);
        return () => clearInterval(iv);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white shadow-sm border border-orange-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                <span className="text-xs text-slate-600 hidden sm:inline">Weather…</span>
            </div>
        );
    }

    // Offline / error fallback — always visible
    if (!weather) {
        return (
            <button
                onClick={fetchWeather}
                title="Click to retry weather"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 border border-orange-200 shadow-sm text-slate-500 transition-all duration-200"
            >
                <Cloud className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium hidden sm:inline">Weather</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">(offline)</span>
            </button>
        );
    }

    const risk = getHeatRiskLevel(weather.temperature, weather.humidity);
    const aqiIdx = Math.min(weather.aqi - 1, 4);

    // Risk dot colors (visible on white bg)
    const riskDotClass =
        risk.level === 'extreme' ? 'bg-red-500 animate-pulse' :
        risk.level === 'high'    ? 'bg-orange-500' :
        risk.level === 'moderate'? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="relative">
            {/* Badge button — white pill on orange header */}
            <button
                onClick={() => setExpanded(e => !e)}
                title="Click for full weather details"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 border border-orange-200 shadow-sm text-slate-800 transition-all duration-200 group"
            >
                {/* Weather icon */}
                <img
                    src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                    alt={weather.description}
                    className="w-6 h-6 -my-1"
                />
                {/* Temperature */}
                <span className="text-sm font-bold text-slate-900">{Math.round(weather.temperature)}°C</span>
                {/* Heat risk dot */}
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${riskDotClass}`} title={`Heat risk: ${risk.level}`} />
                {/* Humidity — hidden on small screens */}
                <span className="hidden lg:flex items-center gap-0.5 text-xs text-slate-500 font-medium">
                    <Droplets className="w-3 h-3 text-blue-400" />{weather.humidity}%
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {/* ── Dropdown panel ── */}
            {expanded && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />

                    {/* Panel */}
                    <div className="absolute top-full right-0 mt-2 w-80 z-50 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                        <style>{`
                            @keyframes fadeIn {
                                from { opacity: 0; transform: translateY(-8px); }
                                to   { opacity: 1; transform: translateY(0); }
                            }
                            .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                        `}</style>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div>
                                <p className="text-white font-semibold text-sm">📍 {weather.location}</p>
                                <p className="text-white/60 text-xs capitalize">{weather.description}</p>
                            </div>
                            <button onClick={() => setExpanded(false)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Main temp row */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <img
                                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                                    alt={weather.description}
                                    className="w-16 h-16 drop-shadow-lg"
                                />
                                <div>
                                    <p className="text-4xl font-bold text-white">{Math.round(weather.temperature)}°C</p>
                                    <p className="text-white/60 text-xs">
                                        {lang === 'hi' ? `महसूस होता है ${Math.round(weather.feelsLike)}°C` : lang === 'mr' ? `जाणवते ${Math.round(weather.feelsLike)}°C` : `Feels like ${Math.round(weather.feelsLike)}°C`}
                                    </p>
                                </div>
                            </div>

                            {/* Heat risk pill */}
                            <div className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide ${risk.bg} ${risk.color}`}>
                                {risk.level === 'extreme' ? '🔴 ' : risk.level === 'high' ? '🟠 ' : risk.level === 'moderate' ? '🟡 ' : '🟢 '}
                                {lang === 'hi'
                                    ? (risk.level === 'extreme' ? 'अत्यधिक गर्मी' : risk.level === 'high' ? 'उच्च ताप' : risk.level === 'moderate' ? 'मध्यम' : 'सामान्य')
                                    : lang === 'mr'
                                        ? (risk.level === 'extreme' ? 'अत्यंत उष्णता' : risk.level === 'high' ? 'उच्च' : risk.level === 'moderate' ? 'मध्यम' : 'सामान्य')
                                        : (risk.level === 'extreme' ? 'Extreme Heat' : risk.level === 'high' ? 'High Heat' : risk.level === 'moderate' ? 'Moderate' : 'Normal')}
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-0 border-b border-white/10">
                            {[
                                { icon: <Droplets className="w-4 h-4" />, label: lang === 'hi' ? 'नमी' : lang === 'mr' ? 'आर्द्रता' : 'Humidity', value: `${weather.humidity}%`, color: 'text-blue-400' },
                                { icon: <Wind className="w-4 h-4" />, label: lang === 'hi' ? 'हवा' : lang === 'mr' ? 'वारा' : 'Wind', value: `${weather.windSpeed} m/s`, color: 'text-cyan-400' },
                                { icon: <Cloud className="w-4 h-4" />, label: lang === 'hi' ? 'बादल' : lang === 'mr' ? 'ढग' : 'Clouds', value: `${weather.clouds}%`, color: 'text-slate-400' },
                            ].map((s, i) => (
                                <div key={i} className={`flex flex-col items-center py-3 gap-1 ${i > 0 ? 'border-l border-white/10' : ''}`}>
                                    <span className={s.color}>{s.icon}</span>
                                    <span className="text-white/50 text-[10px]">{s.label}</span>
                                    <span className="text-white text-sm font-semibold">{s.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* AQI + UV row */}
                        <div className="grid grid-cols-2 gap-0 border-b border-white/10">
                            <div className="flex flex-col items-center py-3 gap-1">
                                <span className="text-white/50 text-[10px] uppercase tracking-wide">AQI</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${AQI_COLORS[aqiIdx]}`} />
                                    <span className={`text-sm font-bold ${AQI_BADGE_COLORS[aqiIdx]}`}>
                                        {AQI_LABELS[lang as keyof typeof AQI_LABELS]?.[aqiIdx] ?? AQI_LABELS.en[aqiIdx]}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center py-3 gap-1 border-l border-white/10">
                                <span className="text-white/50 text-[10px] uppercase tracking-wide">UV Index</span>
                                <div className="flex items-center gap-1.5">
                                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                                    <span className="text-white text-sm font-bold">{weather.uvIndex}</span>
                                    <span className="text-white/60 text-xs">
                                        ({UV_LABELS[lang as keyof typeof UV_LABELS]?.[Math.min(weather.uvIndex, 10)] ?? UV_LABELS.en[Math.min(weather.uvIndex, 10)]})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Heat risk advisory */}
                        {(risk.level === 'extreme' || risk.level === 'high') && (
                            <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border-t border-red-500/20">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-300 text-xs">
                                    {lang === 'hi'
                                        ? 'उच्च गर्मी की चेतावनी! श्रद्धालुओं को पानी पीने और छाया में रहने की सलाह दें।'
                                        : lang === 'mr'
                                            ? 'उच्च उष्णता इशारा! यात्रेकरूंना पाणी पिण्यास आणि सावलीत राहण्यास सांगा.'
                                            : 'High heat advisory! Advise pilgrims to stay hydrated and in the shade.'}
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-4 py-2 text-center text-white/30 text-[10px]">
                            {weather.cached ? '⚡ Cached' : '🔴 Live'} • {lang === 'hi' ? 'हर 5 मिनट अपडेट' : lang === 'mr' ? 'दर 5 मिनिटांनी अपडेट' : 'Updates every 5 min'}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Full-page widget (kept for backward compat) ───────────────────────────────
export default function WeatherWidget() {
    const { lang } = useI18n();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWeather = async () => {
        try {
            const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
            const response = await fetch(`${API_BASE}/weather/current`);
            if (!response.ok) throw new Error('Failed to fetch weather');
            const data = await response.json();
            setWeather(data);
            setError(null);
        } catch (err) {
            console.error('Weather fetch error:', err);
            setError('Unable to load weather data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-sky-100 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-blue-700">
                        {lang === 'hi' ? 'मौसम लोड हो रहा है...' : lang === 'mr' ? 'हवामान लोड होत आहे...' : 'Loading weather...'}
                    </span>
                </div>
            </div>
        );
    }

    if (error || !weather) return null;

    const aqiIdx = Math.min(weather.aqi - 1, 4);
    const uvIdx = Math.min(weather.uvIndex, 10);
    const risk = getHeatRiskLevel(weather.temperature, weather.humidity);

    return (
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-xl overflow-hidden text-white">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                    <p className="font-bold text-lg">📍 {weather.location}</p>
                    <p className="text-white/60 text-sm capitalize">{weather.description}</p>
                </div>
                {(risk.level === 'extreme' || risk.level === 'high') && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${risk.bg} ${risk.color}`}>
                        <AlertTriangle className="w-4 h-4" />
                        {risk.level === 'extreme' ? (lang === 'hi' ? 'अत्यधिक गर्मी' : 'Extreme Heat') : (lang === 'hi' ? 'उच्च ताप' : 'High Heat')}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                    <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" className="w-16 h-16" />
                    <div>
                        <p className="text-4xl font-bold">{Math.round(weather.temperature)}°C</p>
                        <p className="text-white/60 text-sm">
                            {lang === 'hi' ? `महसूस ${Math.round(weather.feelsLike)}°C` : `Feels ${Math.round(weather.feelsLike)}°C`}
                        </p>
                    </div>
                </div>
                {[
                    { icon: <Droplets className="w-5 h-5 text-blue-400" />, label: lang === 'hi' ? 'नमी' : 'Humidity', value: `${weather.humidity}%` },
                    { icon: <Wind className="w-5 h-5 text-cyan-400" />, label: lang === 'hi' ? 'हवा' : 'Wind', value: `${weather.windSpeed} m/s` },
                    { icon: <Thermometer className="w-5 h-5 text-orange-400" />, label: 'UV Index', value: `${weather.uvIndex} (${UV_LABELS[lang as keyof typeof UV_LABELS]?.[uvIdx] ?? UV_LABELS.en[uvIdx]})` },
                ].map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-white/60 text-xs">{s.label}</span></div>
                        <p className="text-lg font-bold">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="px-6 pb-4 flex items-center justify-between text-white/40 text-xs">
                <span>AQI: <span className={`font-semibold ${AQI_BADGE_COLORS[aqiIdx]}`}>{AQI_LABELS[lang as keyof typeof AQI_LABELS]?.[aqiIdx]}</span></span>
                <span>{weather.cached ? '⚡ Cached' : '🔴 Live'} • Auto-refresh 5min</span>
            </div>
        </div>
    );
}
