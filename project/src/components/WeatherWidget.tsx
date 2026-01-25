import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, AlertTriangle, Thermometer, Loader2 } from 'lucide-react';
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

const UV_LABELS = {
    en: ['Low', 'Low', 'Moderate', 'Moderate', 'High', 'High', 'Very High', 'Very High', 'Extreme', 'Extreme', 'Extreme'],
    hi: ['कम', 'कम', 'मध्यम', 'मध्यम', 'उच्च', 'उच्च', 'बहुत उच्च', 'बहुत उच्च', 'गंभीर', 'गंभीर', 'गंभीर'],
    mr: ['कमी', 'कमी', 'मध्यम', 'मध्यम', 'उच्च', 'उच्च', 'अतिउच्च', 'अतिउच्च', 'अत्यंत', 'अत्यंत', 'अत्यंत']
};

const UV_COLORS = ['bg-green-500', 'bg-green-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-orange-500', 'bg-orange-500',
    'bg-red-500', 'bg-red-500', 'bg-purple-500', 'bg-purple-500', 'bg-purple-500'];

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

    // Calculate UV Index label and color
    const uvIndex = weather.uvIndex !== undefined ? Math.min(weather.uvIndex, 10) : 5;
    const uvLabel = UV_LABELS[lang][uvIndex] || UV_LABELS.en[uvIndex];
    const uvColor = UV_COLORS[uvIndex];

    return (
        <div className="relative bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 rounded-2xl p-6 shadow-2xl overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 left-10 w-40 h-40 bg-yellow-200 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                            <Cloud className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                            {lang === 'hi' ? 'वर्तमान मौसम' : lang === 'mr' ? 'सध्याचे हवामान' : 'Current Weather'}
                        </h3>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-white text-sm font-semibold">{weather.location}</span>
                    </div>
                </div>

                {/* Temperature Hero Section */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-orange-400 to-red-500 p-4 rounded-2xl shadow-lg">
                            <Thermometer className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <div className="text-6xl font-bold text-white drop-shadow-lg">
                                {weather.temperature}°C
                            </div>
                            <div className="text-white/80 text-sm mt-1">
                                {lang === 'hi' ? 'महसूस: ' : lang === 'mr' ? 'वाटतं: ' : 'Feels like: '}
                                <span className="font-semibold">{weather.feelsLike}°C</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-center">
                        <img
                            src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`}
                            alt={weather.description}
                            className="w-32 h-32 drop-shadow-2xl"
                        />
                        <div className="text-white text-sm font-medium capitalize -mt-2">
                            {weather.description}
                        </div>
                    </div>
                </div>

                {/* Weather Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Humidity */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/25 transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                            <Droplets className="w-5 h-5 text-cyan-200" />
                            <span className="text-white/80 text-xs font-medium">
                                {lang === 'hi' ? 'नमी' : lang === 'mr' ? 'आर्द्रता' : 'Humidity'}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-white">{weather.humidity}%</div>
                    </div>

                    {/* Air Quality */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/25 transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                            <Wind className="w-5 h-5 text-green-200" />
                            <span className="text-white/80 text-xs font-medium">
                                {lang === 'hi' ? 'वायु' : lang === 'mr' ? 'हवा' : 'Air Quality'}
                            </span>
                        </div>
                        <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${aqiColor} text-white shadow-lg`}>
                            {aqiLabel}
                        </div>
                    </div>

                    {/* UV Index */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/25 transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                            <Thermometer className="w-5 h-5 text-orange-200" />
                            <span className="text-white/80 text-xs font-medium">
                                {lang === 'hi' ? 'UV' : lang === 'mr' ? 'UV' : 'UV Index'}
                            </span>
                        </div>
                        {weather.uvIndex !== undefined ? (
                            <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${uvColor} text-white shadow-lg`}>
                                {weather.uvIndex} - {uvLabel}
                            </div>
                        ) : (
                            <div className="text-2xl font-bold text-white">--</div>
                        )}
                    </div>

                    {/* Wind Speed */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/25 transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                            <Wind className="w-5 h-5 text-blue-200" />
                            <span className="text-white/80 text-xs font-medium">
                                {lang === 'hi' ? 'हवा' : lang === 'mr' ? 'वारा' : 'Wind'}
                            </span>
                        </div>
                        <div className="text-xl font-bold text-white">
                            {weather.windSpeed !== undefined ? `${weather.windSpeed} km/h` : '--'}
                        </div>
                    </div>

                    {/* Visibility */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/25 transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud className="w-5 h-5 text-gray-200" />
                            <span className="text-white/80 text-xs font-medium">
                                {lang === 'hi' ? 'दृश्यता' : lang === 'mr' ? 'दृश्यता' : 'Visibility'}
                            </span>
                        </div>
                        <div className="text-xl font-bold text-white">
                            {weather.visibility !== undefined ? `${weather.visibility} km` : '--'}
                        </div>
                    </div>

                    {/* Pressure */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/25 transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-purple-200" />
                            <span className="text-white/80 text-xs font-medium">
                                {lang === 'hi' ? 'दबाव' : lang === 'mr' ? 'दाब' : 'Pressure'}
                            </span>
                        </div>
                        <div className="text-xl font-bold text-white">
                            {weather.pressure !== undefined ? `${weather.pressure} hPa` : '--'}
                        </div>
                    </div>
                </div>

                {/* UV Warning */}
                {weather.uvIndex !== undefined && weather.uvIndex >= 6 && (
                    <div className={`${weather.uvIndex >= 8 ? 'bg-red-500/90' : 'bg-orange-500/90'} backdrop-blur-sm border border-white/30 rounded-xl p-3 flex items-start gap-3 mb-3 animate-pulse`}>
                        <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-white">
                            <strong>
                                {lang === 'hi' ? '⚠️ UV चेतावनी!' : lang === 'mr' ? '⚠️ UV सतर्कता!' : '⚠️ UV Warning!'}
                            </strong>{' '}
                            {lang === 'hi'
                                ? 'सनस्क्रीन लगाएं और टोपी पहनें।'
                                : lang === 'mr'
                                    ? 'सनस्क्रीन लावा आणि टोपी घाला.'
                                    : 'Apply sunscreen and wear a hat.'
                            }
                        </div>
                    </div>
                )}

                {/* Heat Warning */}
                {(weather.temperature >= 35 || weather.feelsLike >= 35) && (
                    <div className="bg-orange-500/90 backdrop-blur-sm border border-white/30 rounded-xl p-3 flex items-start gap-3 mb-3 animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-white">
                            <strong>
                                {lang === 'hi' ? '🔥 गर्मी चेतावनी!' : lang === 'mr' ? '🔥 उष्णता सतर्कता!' : '🔥 Heat Warning!'}
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
                    <div className={`${weather.aqi >= 4 ? 'bg-red-500/90' : 'bg-yellow-500/90'} backdrop-blur-sm border border-white/30 rounded-xl p-3 flex items-start gap-3 mb-3`}>
                        <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-white">
                            <strong>
                                {lang === 'hi' ? '😷 प्रदूषण चेतावनी!' : lang === 'mr' ? '😷 प्रदूषण सतर्कता!' : '😷 Pollution Alert!'}
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

                {/* Footer */}
                <div className="text-center text-white/70 text-xs mt-4 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    {weather.cached && (lang === 'hi' ? 'कैश से लोड' : lang === 'mr' ? 'कॅशमधून' : 'Cached')} •
                    {lang === 'hi' ? ' हर 5 मिनट में अपडेट' : lang === 'mr' ? ' दर 5 मिनिटांनी' : ' Updates every 5 min'}
                </div>
            </div>
        </div>
    );
}
