import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, AlertTriangle, Thermometer, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

type WeatherData = {
    temperature: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
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
        // Refresh every 5 minutes
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

    if (error || !weather) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Cloud className="w-5 h-5" />
                    <span>{lang === 'hi' ? 'मौसम डेटा उपलब्ध नहीं' : lang === 'mr' ? 'हवामान डेटा उपलब्ध नाही' : 'Weather data unavailable'}</span>
                </div>
            </div>
        );
    }

    const aqiIndex = weather.aqi - 1; // Convert 1-5 to 0-4 for array indexing
    const aqiLabel = AQI_LABELS[lang][aqiIndex] || AQI_LABELS.en[aqiIndex];
    const aqiColor = AQI_COLORS[aqiIndex];

    return (
        <div className="bg-gradient-to-br from-blue-50 to-sky-100 border border-blue-200 rounded-xl p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">
                        {lang === 'hi' ? 'वर्तमान मौसम' : lang === 'mr' ? 'सध्याचे हवामान' : 'Current Weather'}
                    </h3>
                </div>
                <div className="text-xs text-blue-600">
                    {weather.location}
                </div>
            </div>

            {/* Temperature Section */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Thermometer className="w-8 h-8 text-orange-500" />
                    <div>
                        <div className="text-3xl font-bold text-blue-900">{weather.temperature}°C</div>
                        <div className="text-xs text-blue-700">
                            {lang === 'hi' ? 'महसूस: ' : lang === 'mr' ? 'वाटतं: ' : 'Feels like: '}
                            {weather.feelsLike}°C
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <img
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                        alt={weather.description}
                        className="w-16 h-16"
                    />
                    <div className="text-xs text-blue-700 capitalize">{weather.description}</div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    <div>
                        <div className="text-xs text-blue-700">
                            {lang === 'hi' ? 'नमी' : lang === 'mr' ? 'आर्द्रता' : 'Humidity'}
                        </div>
                        <div className="font-semibold text-blue-900">{weather.humidity}%</div>
                    </div>
                </div>
                <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
                    <Wind className="w-4 h-4 text-blue-600" />
                    <div>
                        <div className="text-xs text-blue-700">
                            {lang === 'hi' ? 'वायु गुणवत्ता' : lang === 'mr' ? 'हवा गुणवत्ता' : 'Air Quality'}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-xs font-semibold ${aqiColor}`}>
                            {aqiLabel}
                        </div>
                    </div>
                </div>
            </div>

            {/* Heat Warning */}
            {(weather.temperature >= 35 || weather.feelsLike >= 35) && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-orange-800">
                        <strong>
                            {lang === 'hi' ? 'गर्मी चेतावनी!' : lang === 'mr' ? 'उष्णता सतर्कता!' : 'Heat Warning!'}
                        </strong>{' '}
                        {lang === 'hi'
                            ? 'खूब पानी पिएं और बाहरी गतिविधियों को सीमित करें।'
                            : lang === 'mr'
                                ? 'भरपूर पाणी प्या आणि बाहेरची कामे मर्यादित करा.'
                                : 'Stay hydrated and limit outdoor activities.'
                        }
                    </div>
                </div>
            )}

            {/* Pollution Warning */}
            {weather.aqi >= 3 && (
                <div className={`${weather.aqi >= 4 ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border rounded-lg p-3 flex items-start gap-2 mt-2`}>
                    <AlertTriangle className={`w-4 h-4 ${weather.aqi >= 4 ? 'text-red-600' : 'text-yellow-600'} flex-shrink-0 mt-0.5`} />
                    <div className={`text-xs ${weather.aqi >= 4 ? 'text-red-800' : 'text-yellow-800'}`}>
                        <strong>
                            {lang === 'hi' ? 'प्रदूषण चेतावनी!' : lang === 'mr' ? 'प्रदूषण सतर्कता!' : 'Pollution Alert!'}
                        </strong>{' '}
                        {lang === 'hi'
                            ? 'बाहर जाते समय मास्क पहनें।'
                            : lang === 'mr'
                                ? 'बाहेर जाताना मास्क घाला.'
                                : 'Wear a mask when outdoors.'
                        }
                    </div>
                </div>
            )}

            {/* Last Updated */}
            <div className="text-xs text-blue-500 text-center mt-3">
                {weather.cached && (lang === 'hi' ? 'कैश से लोड किया गया' : lang === 'mr' ? 'कॅशमधून लोड केले' : 'Cached data')} •
                {lang === 'hi' ? ' हर 5 मिनट में अपडेट' : lang === 'mr' ? ' दर 5 मिनिटांनी अपडेट' : ' Updates every 5 min'}
            </div>
        </div>
    );
}
