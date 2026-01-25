/**
 * Health Risk Scoring Algorithm
 * Calculates a risk score (0-100) based on multiple factors
 */

// Condition normalization map (reuse from analytics)
const conditionNormalizer = {
    'hypertension': 'Hypertension',
    'उच्च रक्तदाब': 'Hypertension',
    'उच्च रक्तदाब (bp)': 'Hypertension',
    'bp': 'Hypertension',
    'high blood pressure': 'Hypertension',

    'diabetes': 'Diabetes',
    'मधुमेह': 'Diabetes',
    'मधुमेह (diabetes)': 'Diabetes',
    'sugar': 'Diabetes',

    'heart disease': 'Heart Disease',
    'हृदय रोग': 'Heart Disease',
    'हृदय रोग (heart disease)': 'Heart Disease',
    'cardiac': 'Heart Disease',

    'asthma': 'Asthma',
    'दमा': 'Asthma',
    'दमा (asthma)': 'Asthma',

    'kidney disease': 'Kidney Disease',
    'kidney problem': 'Kidney Disease',
    'गुर्दे की बीमारी': 'Kidney Disease',
};

const normalizeCondition = (condition) => {
    const lowerCondition = condition.toLowerCase().trim();
    return conditionNormalizer[lowerCondition] || condition;
};

// Risk weights for different conditions
const conditionRiskWeights = {
    'Heart Disease': 15,
    'Hypertension': 10,
    'Diabetes': 10,
    'Kidney Disease': 12,
    'Asthma': 8,
};

/**
 * Calculate age-based risk score (0-30 points)
 */
function calculateAgeRisk(age) {
    if (!age) return 0;

    if (age > 70) return 30;
    if (age >= 60) return 20;
    if (age >= 50) return 10;
    if (age < 18) return 5;
    return 0;
}

/**
 * Calculate medical conditions risk score (0-40 points)
 */
function calculateMedicalRisk(chronicConditions) {
    if (!chronicConditions || chronicConditions === 'None') return 0;

    const conditions = chronicConditions.split(',').map(c => c.trim());
    const normalizedConditions = conditions
        .map(normalizeCondition)
        .filter(c => c !== 'None');

    if (normalizedConditions.length === 0) return 0;

    // Calculate base risk from conditions
    let baseRisk = 0;
    normalizedConditions.forEach(condition => {
        baseRisk += conditionRiskWeights[condition] || 5; // Default 5 points for unknown conditions
    });

    // Multiple conditions multiplier
    if (normalizedConditions.length > 1) {
        baseRisk *= 1.5;
    }

    // Cap at 40 points
    return Math.min(baseRisk, 40);
}

/**
 * Calculate environmental risk score based on weather (0-20 points)
 */
function calculateEnvironmentalRisk(weatherData) {
    if (!weatherData) return 0;

    let envRisk = 0;

    // Temperature risk
    const temp = weatherData.temp;
    if (temp > 40) {
        envRisk += 10;
    } else if (temp >= 35) {
        envRisk += 5;
    }

    // Humidity risk
    const humidity = weatherData.humidity;
    if (humidity > 80) {
        envRisk += 5;
    }

    // Air quality risk (if available)
    const aqi = weatherData.aqi;
    if (aqi && aqi > 200) {
        envRisk += 10;
    } else if (aqi && aqi > 150) {
        envRisk += 5;
    }

    return Math.min(envRisk, 20);
}

/**
 * Calculate crowd density risk (0-10 points)
 */
function calculateCrowdRisk(totalDevotees) {
    if (!totalDevotees) return 0;

    if (totalDevotees > 100000) return 10;
    if (totalDevotees > 50000) return 5;
    return 0;
}

/**
 * Main risk scoring function
 * Returns an object with total score and breakdown
 */
export function calculateRiskScore(devotee, medicalRecord, weatherData, totalDevotees) {
    const ageRisk = calculateAgeRisk(devotee.age);
    const medicalRisk = calculateMedicalRisk(medicalRecord?.chronic_conditions);
    const envRisk = calculateEnvironmentalRisk(weatherData);
    const crowdRisk = calculateCrowdRisk(totalDevotees);

    const totalScore = Math.min(ageRisk + medicalRisk + envRisk + crowdRisk, 100);

    // Determine risk level
    let riskLevel = 'Low';
    let riskColor = 'green';

    if (totalScore >= 75) {
        riskLevel = 'Critical';
        riskColor = 'red';
    } else if (totalScore >= 50) {
        riskLevel = 'High';
        riskColor = 'orange';
    } else if (totalScore >= 25) {
        riskLevel = 'Moderate';
        riskColor = 'yellow';
    }

    return {
        totalScore: Math.round(totalScore),
        riskLevel,
        riskColor,
        breakdown: {
            age: ageRisk,
            medical: Math.round(medicalRisk),
            environmental: envRisk,
            crowd: crowdRisk
        },
        recommendations: generateRecommendations(totalScore, ageRisk, medicalRisk, envRisk)
    };
}

/**
 * Generate personalized recommendations based on risk factors
 */
function generateRecommendations(totalScore, ageRisk, medicalRisk, envRisk) {
    const recommendations = [];

    if (totalScore >= 75) {
        recommendations.push('🚨 Immediate medical evaluation recommended');
        recommendations.push('Assign dedicated monitoring staff');
    }

    if (ageRisk >= 20) {
        recommendations.push('👴 Elderly care: Ensure rest periods every 2 hours');
        recommendations.push('Monitor for signs of exhaustion');
    }

    if (medicalRisk >= 15) {
        recommendations.push('💊 Verify medication compliance');
        recommendations.push('Keep emergency contacts updated');
    }

    if (envRisk >= 10) {
        recommendations.push('🌡️ Heat risk: Ensure adequate hydration');
        recommendations.push('Advise to avoid midday sun exposure');
    }

    if (recommendations.length === 0) {
        recommendations.push('✅ Standard care protocols apply');
    }

    return recommendations;
}
