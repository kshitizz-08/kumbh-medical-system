/**
 * Health Risk Scoring Algorithm
 * Calculates a risk score (0-100) based on multiple factors
 * Factors: Age, Medical Conditions, BMI, Medication Interactions, 
 *          Allergy-Weather Cross-Risk, Environmental, Crowd Density
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

// ─── Dangerous medication interaction pairs ───
const DANGEROUS_MED_PAIRS = [
    { drugs: ['warfarin', 'aspirin'], risk: 8, reason: 'Blood thinner + anti-platelet = bleeding risk' },
    { drugs: ['warfarin', 'ibuprofen'], risk: 8, reason: 'Blood thinner + NSAID = bleeding risk' },
    { drugs: ['aspirin', 'ibuprofen'], risk: 5, reason: 'Dual anti-inflammatory = GI bleed risk' },
    { drugs: ['metformin', 'insulin'], risk: 4, reason: 'Dual glucose control = hypoglycemia risk' },
    { drugs: ['lisinopril', 'losartan'], risk: 6, reason: 'Dual RAAS blockade = kidney risk' },
    { drugs: ['amlodipine', 'atenolol'], risk: 5, reason: 'Dual BP lowering = hypotension risk' },
    { drugs: ['clopidogrel', 'aspirin'], risk: 6, reason: 'Dual anti-platelet = bleeding risk' },
    { drugs: ['omeprazole', 'clopidogrel'], risk: 5, reason: 'PPI reduces clopidogrel efficacy' },
];

// ─── Allergy-Weather cross-risk keywords ───
const WEATHER_SENSITIVE_ALLERGIES = {
    'dust': { aqiThreshold: 150, riskPoints: 5 },
    'pollen': { aqiThreshold: 100, riskPoints: 5 },
    'mold': { aqiThreshold: 100, riskPoints: 4 },
    'animal dander': { aqiThreshold: 150, riskPoints: 3 },
};

/**
 * Calculate age-based risk score (0-25 points)
 */
function calculateAgeRisk(age) {
    if (!age) return 0;

    if (age > 70) return 25;
    if (age >= 60) return 18;
    if (age >= 50) return 10;
    if (age < 5) return 10;
    if (age < 18) return 5;
    return 0;
}

/**
 * Calculate medical conditions risk score (0-30 points)
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

    // Multiple conditions multiplier (comorbidity risk)
    if (normalizedConditions.length >= 3) {
        baseRisk *= 1.8;
    } else if (normalizedConditions.length > 1) {
        baseRisk *= 1.5;
    }

    // Cap at 30 points
    return Math.min(baseRisk, 30);
}

/**
 * Calculate BMI risk score (0-10 points)
 */
function calculateBMIRisk(heightCm, weightKg) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    // Severely underweight or morbidly obese = highest risk
    if (bmi < 16) return 10;         // Severely underweight
    if (bmi >= 40) return 10;        // Morbidly obese
    if (bmi < 18.5) return 6;        // Underweight
    if (bmi >= 35) return 8;         // Obese class II
    if (bmi >= 30) return 5;         // Obese class I
    if (bmi >= 25) return 2;         // Overweight
    return 0;                         // Normal (18.5-24.9)
}

/**
 * Calculate medication interaction risk (0-15 points)
 */
function calculateMedicationInteractionRisk(currentMedications) {
    if (!currentMedications || currentMedications === 'None') return 0;

    const meds = currentMedications
        .toLowerCase()
        .split(',')
        .map(m => m.trim().split(' ')[0]); // Extract drug name (ignore dosage)

    let interactionRisk = 0;
    const flaggedInteractions = [];

    for (const pair of DANGEROUS_MED_PAIRS) {
        const hasAll = pair.drugs.every(drug =>
            meds.some(m => m.includes(drug))
        );
        if (hasAll) {
            interactionRisk += pair.risk;
            flaggedInteractions.push(pair.reason);
        }
    }

    // Also flag polypharmacy (5+ medications = general elevated risk)
    if (meds.length >= 5) {
        interactionRisk += 5;
    }

    return Math.min(interactionRisk, 15);
}

/**
 * Calculate allergy-weather cross-risk (0-10 points)
 */
function calculateAllergyWeatherRisk(allergies, weatherData) {
    if (!allergies || allergies === 'None' || !weatherData) return 0;

    const allergyList = allergies.toLowerCase().split(',').map(a => a.trim());
    const aqi = weatherData.aqi || 0;
    let risk = 0;

    for (const [allergyKeyword, config] of Object.entries(WEATHER_SENSITIVE_ALLERGIES)) {
        const hasAllergy = allergyList.some(a => a.includes(allergyKeyword));
        if (hasAllergy && aqi > config.aqiThreshold) {
            risk += config.riskPoints;
        }
    }

    // High humidity + dust allergy = amplified risk
    if (allergyList.some(a => a.includes('dust')) && weatherData.humidity > 80) {
        risk += 3;
    }

    return Math.min(risk, 10);
}

/**
 * Calculate environmental risk score based on weather (0-15 points)
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
    } else if (temp < 10) {
        envRisk += 5; // Cold weather risk too
    }

    // Humidity risk
    const humidity = weatherData.humidity;
    if (humidity > 80) {
        envRisk += 3;
    }

    // Air quality risk (if available)
    const aqi = weatherData.aqi;
    if (aqi && aqi > 200) {
        envRisk += 5;
    } else if (aqi && aqi > 150) {
        envRisk += 3;
    }

    return Math.min(envRisk, 15);
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
    const bmiRisk = calculateBMIRisk(medicalRecord?.height_cm, medicalRecord?.weight_kg);
    const medInteractionRisk = calculateMedicationInteractionRisk(medicalRecord?.current_medications);
    const allergyWeatherRisk = calculateAllergyWeatherRisk(medicalRecord?.allergies, weatherData);
    const envRisk = calculateEnvironmentalRisk(weatherData);
    const crowdRisk = calculateCrowdRisk(totalDevotees);

    const totalScore = Math.min(
        ageRisk + medicalRisk + bmiRisk + medInteractionRisk + allergyWeatherRisk + envRisk + crowdRisk,
        100
    );

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
            bmi: bmiRisk,
            medicationInteractions: medInteractionRisk,
            allergyWeather: allergyWeatherRisk,
            environmental: envRisk,
            crowd: crowdRisk
        },
        recommendations: generateRecommendations(totalScore, ageRisk, medicalRisk, envRisk, bmiRisk, medInteractionRisk, allergyWeatherRisk)
    };
}

/**
 * Generate personalized recommendations based on risk factors
 */
function generateRecommendations(totalScore, ageRisk, medicalRisk, envRisk, bmiRisk, medInteractionRisk, allergyWeatherRisk) {
    const recommendations = [];

    if (totalScore >= 75) {
        recommendations.push('🚨 Immediate medical evaluation recommended');
        recommendations.push('Assign dedicated monitoring staff');
    }

    if (ageRisk >= 18) {
        recommendations.push('👴 Elderly care: Ensure rest periods every 2 hours');
        recommendations.push('Monitor for signs of exhaustion');
    }

    if (medicalRisk >= 15) {
        recommendations.push('💊 Verify medication compliance');
        recommendations.push('Keep emergency contacts updated');
    }

    if (bmiRisk >= 5) {
        recommendations.push('⚖️ BMI risk: Monitor nutritional intake and hydration closely');
    }

    if (medInteractionRisk >= 5) {
        recommendations.push('⚠️ Medication interaction risk: Review prescriptions with attending physician');
        recommendations.push('Monitor for adverse drug reactions');
    }

    if (allergyWeatherRisk >= 3) {
        recommendations.push('🌿 Allergy-weather risk: Advise wearing N95 mask due to air quality');
        recommendations.push('Keep antihistamines and rescue inhaler accessible');
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

