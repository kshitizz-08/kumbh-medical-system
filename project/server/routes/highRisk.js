import express from 'express';
import { Devotee } from '../models/Devotee.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { calculateRiskScore } from '../utils/riskScoring.js';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * Get current weather data for risk calculation
 */
async function getCurrentWeather() {
    try {
        const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo';
        const city = 'Prayagraj'; // Kumbh Mela location

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            console.warn('Weather API failed, using default values');
            return { temp: 30, humidity: 60, aqi: 100 }; // Safe defaults
        }

        const data = await response.json();
        return {
            temp: data.main.temp,
            humidity: data.main.humidity,
            aqi: 100 // Default AQI, can be enhanced with air quality API
        };
    } catch (error) {
        console.error('Weather fetch error:', error);
        return { temp: 30, humidity: 60, aqi: 100 }; // Safe defaults
    }
}

/**
 * GET /api/high-risk/list
 * Get all patients with risk scores, sorted by risk level
 */
router.get('/list', async (req, res) => {
    try {
        const { limit = 100, minScore = 0 } = req.query;

        // Get all devotees with their medical records
        const devotees = await Devotee.find().lean();
        const totalDevotees = devotees.length;

        // Get weather data
        const weatherData = await getCurrentWeather();

        // Calculate risk scores for all devotees
        const riskAssessments = [];

        for (const devotee of devotees) {
            // Get medical record
            const medicalRecord = await MedicalRecord.findOne({ devotee_id: devotee.devotee_id }).lean();

            // Calculate risk score
            const riskData = calculateRiskScore(devotee, medicalRecord, weatherData, totalDevotees);

            // Only include if meets minimum score
            if (riskData.totalScore >= minScore) {
                riskAssessments.push({
                    devotee: {
                        _id: devotee._id.toString(), // MongoDB ID for fetching full profile
                        devotee_id: devotee.devotee_id,
                        name: devotee.name,
                        age: devotee.age,
                        gender: devotee.gender,
                        phone: devotee.phone,
                        photo: devotee.photo
                    },
                    medicalRecord: {
                        chronic_conditions: medicalRecord?.chronic_conditions || 'None',
                        blood_group: medicalRecord?.blood_group,
                        allergies: medicalRecord?.allergies
                    },
                    riskScore: riskData.totalScore,
                    riskLevel: riskData.riskLevel,
                    riskColor: riskData.riskColor,
                    breakdown: riskData.breakdown,
                    recommendations: riskData.recommendations
                });
            }
        }

        // Sort by risk score (highest first)
        riskAssessments.sort((a, b) => b.riskScore - a.riskScore);

        // Limit results
        const limitedResults = riskAssessments.slice(0, parseInt(limit));

        res.json({
            total: riskAssessments.length,
            weatherData,
            patients: limitedResults
        });

    } catch (error) {
        console.error('High-risk list error:', error);
        res.status(500).json({ message: 'Failed to fetch high-risk patients' });
    }
});

/**
 * GET /api/high-risk/critical
 * Get only critical patients (risk score >= 75)
 */
router.get('/critical', async (req, res) => {
    try {
        const devotees = await Devotee.find().lean();
        const totalDevotees = devotees.length;
        const weatherData = await getCurrentWeather();

        const criticalPatients = [];

        for (const devotee of devotees) {
            const medicalRecord = await MedicalRecord.findOne({ devotee_id: devotee.devotee_id }).lean();
            const riskData = calculateRiskScore(devotee, medicalRecord, weatherData, totalDevotees);

            if (riskData.totalScore >= 75) {
                criticalPatients.push({
                    devotee: {
                        _id: devotee._id.toString(), // MongoDB ID for fetching full profile
                        devotee_id: devotee.devotee_id,
                        name: devotee.name,
                        age: devotee.age,
                        gender: devotee.gender,
                        phone: devotee.phone,
                        photo: devotee.photo
                    },
                    medicalRecord: {
                        chronic_conditions: medicalRecord?.chronic_conditions || 'None',
                        blood_group: medicalRecord?.blood_group
                    },
                    riskScore: riskData.totalScore,
                    riskLevel: riskData.riskLevel,
                    recommendations: riskData.recommendations
                });
            }
        }

        criticalPatients.sort((a, b) => b.riskScore - a.riskScore);

        res.json({
            count: criticalPatients.length,
            patients: criticalPatients
        });

    } catch (error) {
        console.error('Critical patients error:', error);
        res.status(500).json({ message: 'Failed to fetch critical patients' });
    }
});

/**
 * GET /api/high-risk/stats
 * Get statistics on risk distribution
 */
router.get('/stats', async (req, res) => {
    try {
        const devotees = await Devotee.find().lean();
        const totalDevotees = devotees.length;
        const weatherData = await getCurrentWeather();

        const stats = {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0
        };

        for (const devotee of devotees) {
            const medicalRecord = await MedicalRecord.findOne({ devotee_id: devotee.devotee_id }).lean();
            const riskData = calculateRiskScore(devotee, medicalRecord, weatherData, totalDevotees);

            if (riskData.totalScore >= 75) stats.critical++;
            else if (riskData.totalScore >= 50) stats.high++;
            else if (riskData.totalScore >= 25) stats.moderate++;
            else stats.low++;
        }

        res.json(stats);

    } catch (error) {
        console.error('Risk stats error:', error);
        res.status(500).json({ message: 'Failed to fetch risk statistics' });
    }
});

export const highRiskRouter = router;
