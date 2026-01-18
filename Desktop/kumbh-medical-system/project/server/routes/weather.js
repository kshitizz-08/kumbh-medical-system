import express from 'express';
import https from 'https';

const router = express.Router();

// Nashik coordinates (location for Kumbh Mela)
const NASHIK_LAT = 19.9975;
const NASHIK_LON = 73.7898;

// Cache for weather data (to avoid excessive API calls)
let weatherCache = {
    data: null,
    timestamp: null,
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds
};

// Helper function to check if cache is valid
function isCacheValid() {
    if (!weatherCache.data || !weatherCache.timestamp) return false;
    const now = Date.now();
    return (now - weatherCache.timestamp) < weatherCache.CACHE_DURATION;
}

// Helper function to make HTTPS GET request
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fetch weather data from OpenWeatherMap API
async function fetchWeatherData(apiKey) {
    try {
        // Fetch current weather and air pollution data
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${NASHIK_LAT}&lon=${NASHIK_LON}&appid=${apiKey}&units=metric`;
        const airPollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${NASHIK_LAT}&lon=${NASHIK_LON}&appid=${apiKey}`;

        const [weatherData, airData] = await Promise.all([
            httpsGet(weatherUrl),
            httpsGet(airPollutionUrl)
        ]);

        return {
            temperature: Math.round(weatherData.main.temp),
            feelsLike: Math.round(weatherData.main.feels_like),
            humidity: weatherData.main.humidity,
            description: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon,
            aqi: airData.list[0].main.aqi, // 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
            pollutants: airData.list[0].components,
            location: 'Nashik',
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

// Determine alert level based on temperature and AQI
function getAlerts(temperature, feelsLike, aqi) {
    const alerts = [];

    // Heat warnings
    if (feelsLike >= 40) {
        alerts.push({
            type: 'extreme_heat',
            severity: 'critical',
            message: {
                en: `Extreme Heat Alert! Feels like ${feelsLike}°C. Avoid outdoor activities. Stay hydrated.`,
                hi: `अत्यधिक गर्मी चेतावनी! ${feelsLike}°C महसूस हो रहा है। बाहरी गतिविधियों से बचें। हाइड्रेटेड रहें।`,
                mr: `अत्यधिक उष्णता सतर्कता! ${feelsLike}°C वाटत आहे. बाहेरची कामं टाळा. हायड्रेटेड रहा.`
            }
        });
    } else if (feelsLike >= 35 || temperature >= 35) {
        alerts.push({
            type: 'heat_warning',
            severity: 'high',
            message: {
                en: `Heat Warning! Temperature: ${temperature}°C (Feels like ${feelsLike}°C). Drink plenty of water.`,
                hi: `गर्मी चेतावनी! तापमान: ${temperature}°C (${feelsLike}°C जैसा महसूस)। खूब पानी पिएं।`,
                mr: `उष्णता सतर्कता! तापमान: ${temperature}°C (${feelsLike}°C असे वाटते). भरपूर पाणी प्या.`
            }
        });
    }

    // Pollution warnings
    if (aqi >= 4) {
        alerts.push({
            type: 'severe_pollution',
            severity: 'critical',
            message: {
                en: 'Severe Air Pollution! Wear N95 mask outdoors. Limit outdoor exposure.',
                hi: 'गंभीर वायु प्रदूषण! बाहर N95 मास्क पहनें। बाहरी गतिविधि सीमित करें।',
                mr: 'गंभीर वायू प्रदूषण! बाहेर N95 मास्क घाला. बाहेरचे एक्सपोजर मर्यादित करा.'
            }
        });
    } else if (aqi === 3) {
        alerts.push({
            type: 'pollution_alert',
            severity: 'moderate',
            message: {
                en: 'Moderate Air Pollution. Sensitive individuals should limit outdoor activity.',
                hi: 'मध्यम वायु प्रदूषण। संवेदनशील व्यक्तियों को बाहरी गतिविधि सीमित करनी चाहिए।',
                mr: 'मध्यम वायु प्रदूषण. संवेदनशील व्यक्तींनी बाहेरची कामे मर्यादित करावीत.'
            }
        });
    }

    return alerts;
}

// GET /api/weather/current
// Returns current weather data for Nashik
router.get('/current', async (req, res) => {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return res.json({
                error: 'Weather API key not configured',
                mockData: true,
                temperature: 32,
                feelsLike: 35,
                humidity: 45,
                description: 'clear sky',
                icon: '01d',
                aqi: 2,
                location: 'Nashik (Demo Mode)'
            });
        }

        // Check cache first
        if (isCacheValid()) {
            return res.json({
                cached: true,
                ...weatherCache.data
            });
        }

        // Fetch fresh data
        try {
            const weatherData = await fetchWeatherData(apiKey);

            // Update cache
            weatherCache.data = weatherData;
            weatherCache.timestamp = Date.now();

            res.json({
                cached: false,
                ...weatherData
            });
        } catch (apiError) {
            // If API fails (invalid key, not activated, etc), return demo data
            console.error('OpenWeatherMap API error:', apiError.message);
            res.json({
                error: 'API key not yet activated or invalid',
                mockData: true,
                temperature: 28,
                feelsLike: 31,
                humidity: 55,
                description: 'partly cloudy',
                icon: '02d',
                aqi: 2,
                location: 'Nashik (Demo - API Key Pending Activation)',
                note: 'Demo data shown. OpenWeatherMap API keys take 2-10 hours to activate after creation.'
            });
        }
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({
            error: 'Failed to fetch weather data',
            message: error.message
        });
    }
});

// GET /api/weather/alerts
// Returns active weather/pollution alerts
router.get('/alerts', async (req, res) => {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return res.json({
                alerts: [],
                mockData: true
            });
        }

        // Use cached data if available, otherwise fetch
        let weatherData;
        if (isCacheValid()) {
            weatherData = weatherCache.data;
        } else {
            weatherData = await fetchWeatherData(apiKey);
            weatherCache.data = weatherData;
            weatherCache.timestamp = Date.now();
        }

        const alerts = getAlerts(
            weatherData.temperature,
            weatherData.feelsLike,
            weatherData.aqi
        );

        res.json({
            alerts,
            timestamp: new Date().toISOString(),
            location: weatherData.location
        });
    } catch (error) {
        console.error('Weather alerts error:', error);
        res.status(500).json({
            error: 'Failed to fetch weather alerts'
        });
    }
});

// GET /api/weather/health-tips
// Returns weather-based health recommendations
router.get('/health-tips', async (req, res) => {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return res.json({ tips: [] });
        }

        let weatherData;
        if (isCacheValid()) {
            weatherData = weatherCache.data;
        } else {
            weatherData = await fetchWeatherData(apiKey);
            weatherCache.data = weatherData;
            weatherCache.timestamp = Date.now();
        }

        const tips = [];

        // Heat-based tips
        if (weatherData.feelsLike >= 35) {
            tips.push({
                category: 'heat',
                severity: weatherData.feelsLike >= 40 ? 'critical' : 'high',
                recommendations: {
                    en: [
                        'Avoid outdoor activities between 11 AM - 4 PM',
                        'Drink 12-15 glasses of water daily',
                        'Wear light-colored, loose clothing',
                        'Seek shade frequently',
                        'Watch for signs of heat stroke: dizziness, nausea, rapid heartbeat'
                    ],
                    hi: [
                        'सुबह 11 से शाम 4 बजे के बीच बाहर जाने से बचें',
                        'प्रतिदिन 12-15 गिलास पानी पिएं',
                        'हल्के रंग के ढीले कपड़े पहनें',
                        'बार-बार छाया में रहें',
                        'हीट स्ट्रोक के लक्षणों पर ध्यान दें: चक्कर आना, मतली, तेज़ दिल की धड़कन'
                    ],
                    mr: [
                        'सकाळी 11 ते संध्याकाळी 4 दरम्यान बाहेरची कामे टाळा',
                        'दररोज 12-15 ग्लास पाणी प्या',
                        'हलके रंगाचे मोकळे कपडे घाला',
                        'वारंवार सावलीत रहा',
                        'हीट स्ट्रोकच्या लक्षणांकडे लक्ष द्या: चक्कर येणे, मळमळ, जलद हृदयाचा ठोका'
                    ]
                }
            });
        }

        // Pollution-based tips
        if (weatherData.aqi >= 3) {
            tips.push({
                category: 'pollution',
                severity: weatherData.aqi >= 4 ? 'critical' : 'moderate',
                recommendations: {
                    en: [
                        'Wear N95 or KN95 mask when outdoors',
                        'Keep windows closed during high pollution hours',
                        'Avoid strenuous outdoor exercise',
                        'Rinse eyes with clean water if irritation occurs',
                        'Consult doctor if breathing difficulty persists'
                    ],
                    hi: [
                        'बाहर जाते समय N95 या KN95 मास्क पहनें',
                        'अधिक प्रदूषण के समय खिड़कियां बंद रखें',
                        'ज़ोरदार बाहरी व्यायाम से बचें',
                        'जलन होने पर आंखों को साफ पानी से धोएं',
                        'सांस लेने में कठिनाई बनी रहे तो डॉक्टर से परामर्श लें'
                    ],
                    mr: [
                        'बाहेर जाताना N95 किंवा KN95 मास्क घाला',
                        'जास्त प्रदूषणाच्या वेळी खिडक्या बंद ठेवा',
                        'कठोर बाहेरचा व्यायाम टाळा',
                        'जळजळ झाल्यास स्वच्छ पाण्याने डोळे धुवा',
                        'श्वास घेण्यात अडचण कायम राहिल्यास डॉक्टरांचा सल्ला घ्या'
                    ]
                }
            });
        }

        res.json({
            tips,
            temperature: weatherData.temperature,
            feelsLike: weatherData.feelsLike,
            aqi: weatherData.aqi,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health tips error:', error);
        res.status(500).json({ error: 'Failed to fetch health tips' });
    }
});

export default router;
