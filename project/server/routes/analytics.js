import express from 'express';
import { Devotee } from '../models/Devotee.js';
import { MedicalRecord } from '../models/MedicalRecord.js';

const router = express.Router();

// GET /api/analytics/stats
router.get('/stats', async (req, res) => {
    try {
        const totalDevotees = await Devotee.countDocuments();

        // Age demographics
        const ageGroups = await Devotee.aggregate([
            {
                $project: {
                    ageGroup: {
                        $switch: {
                            branches: [
                                { case: { $lte: ['$age', 18] }, then: '0-18' },
                                { case: { $lte: ['$age', 30] }, then: '19-30' },
                                { case: { $lte: ['$age', 50] }, then: '31-50' },
                                { case: { $lte: ['$age', 70] }, then: '51-70' },
                            ],
                            default: '70+'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$ageGroup',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Gender demographics
        const genderStats = await Devotee.aggregate([
            {
                $group: {
                    _id: '$gender',
                    count: { $sum: 1 }
                }
            }
        ]);

        // High Risk Count (Age > 60)
        const highRiskAgeCount = await Devotee.countDocuments({ age: { $gt: 60 } });

        // Recent registrations (Last 24 hours)
        const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        const recentRegistrations = await Devotee.countDocuments({ created_at: { $gte: oneDayAgo } });

        // Health Conditions Analysis
        // Since chronic_conditions is a string (comma separated), we need to do some text analysis
        // Ideally this should be an array in schema, but working with what we have
        const medicalRecords = await MedicalRecord.find({}, 'chronic_conditions');

        // Normalization map for multilingual condition names
        const conditionNormalizer = {
            // Hypertension variations
            'hypertension': 'Hypertension',
            'उच्च रक्तदाब': 'Hypertension',
            'उच्च रक्तदाब (bp)': 'Hypertension',
            'bp': 'Hypertension',
            'high blood pressure': 'Hypertension',
            
            // Diabetes variations
            'diabetes': 'Diabetes',
            'मधुमेह': 'Diabetes',
            'मधुमेह (diabetes)': 'Diabetes',
            'sugar': 'Diabetes',
            
            // Heart Disease variations
            'heart disease': 'Heart Disease',
            'हृदय रोग': 'Heart Disease',
            'हृदय रोग (heart disease)': 'Heart Disease',
            'cardiac': 'Heart Disease',
            
            // Asthma variations
            'asthma': 'Asthma',
            'दमा': 'Asthma',
            'दमा (asthma)': 'Asthma',
            
            // Kidney Disease variations
            'kidney disease': 'Kidney Disease',
            'kidney problem': 'Kidney Disease',
            'गुर्दे की बीमारी': 'Kidney Disease',
            
            // Arthritis variations
            'arthritis': 'Arthritis',
            'गठिया': 'Arthritis',
            
            // Thyroid variations
            'thyroid': 'Thyroid',
            'थायराइड': 'Thyroid',
            
            // None variations
            'none': 'None',
            'काही नाही': 'None',
            'कोई नहीं': 'None',
            'no': 'None',
        };

        const normalizeCondition = (condition) => {
            const lowerCondition = condition.toLowerCase().trim();
            return conditionNormalizer[lowerCondition] || condition;
        };

        const conditionStats = {};
        let highRiskMedicalCount = 0;

        medicalRecords.forEach(record => {
            if (record.chronic_conditions && record.chronic_conditions !== 'None') {
                highRiskMedicalCount++;
                const conditions = record.chronic_conditions.split(',').map(c => c.trim());
                conditions.forEach(condition => {
                    if (condition && condition !== 'None') {
                        const normalizedCondition = normalizeCondition(condition);
                        if (normalizedCondition !== 'None') {
                            conditionStats[normalizedCondition] = (conditionStats[normalizedCondition] || 0) + 1;
                        }
                    }
                });
            }
        });

        const topConditions = Object.entries(conditionStats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5 conditions

        res.json({
            totalDevotees,
            recentRegistrations,
            demographics: {
                age: ageGroups,
                gender: genderStats
            },
            analysis: {
                highRiskAge: highRiskAgeCount,
                highRiskMedical: highRiskMedicalCount,
                topConditions
            },
            alerts: topConditions.filter(c => c.count >= 5).map(c => ({
                condition: c.name,
                count: c.count,
                severity: 'high'
            }))
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data' });
    }
});

export const analyticsRouter = router;
