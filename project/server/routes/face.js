import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/analyze', async (req, res) => {
    try {
        const { image } = req.body; // Expecting base64 string
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();

        if (!apiKey) {
            console.warn('Gemini API key missing. Using mock data.');
            return res.json({
                age: 25,
                gender: 'male',
                estimatedHeight: 170,
                estimatedWeight: 65,
                confidence: { age: 0.3, gender: 0.3, height: 0.1, weight: 0.1 },
                mock: true
            });
        }

        // Remove data:image/jpeg;base64, prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // Models ordered by preference: newest/best first
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-2.5-pro",
            "gemini-pro-latest"
        ];

        let result = null;
        let errors = [];

        const prompt = `Analyze this image and accurately estimate the age, gender, height (cm), and weight (kg) of the person.`;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
            }
        };

        const { SchemaType } = await import('@google/generative-ai');
        
        const responseSchema = {
            type: SchemaType.OBJECT,
            properties: {
                age: { type: SchemaType.INTEGER },
                gender: { type: SchemaType.STRING },
                estimatedHeight: { type: SchemaType.INTEGER },
                estimatedWeight: { type: SchemaType.INTEGER }
            },
            required: ["age", "gender", "estimatedHeight", "estimatedWeight"]
        };

        // Try models sequentially
        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting analysis with model: ${modelName}`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: responseSchema,
                        temperature: 0.2,
                    },
                });
                result = await model.generateContent([prompt, imagePart]);
                console.log(`Success with model: ${modelName}`);
                break;
            } catch (error) {
                console.warn(`Model ${modelName} failed:`, error.message);
                errors.push(`${modelName}: ${error.message}`);
            }
        }

        if (!result) {
            throw new Error(`All Gemini models failed. Errors: ${errors.join(' | ')}`);
        }

        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        // BMI cross-validation: flag implausible height/weight combinations
        if (data.estimatedHeight && data.estimatedWeight) {
            const heightM = data.estimatedHeight / 100;
            const bmi = data.estimatedWeight / (heightM * heightM);

            // Plausible BMI range: 12-50. Outside this range, adjust estimates.
            if (bmi < 12 || bmi > 50) {
                console.warn(`BMI out of plausible range (${bmi.toFixed(1)}). Adjusting estimates.`);
                // Use Indian averages based on gender
                if (data.gender === 'male') {
                    data.estimatedHeight = 167;
                    data.estimatedWeight = 65;
                } else {
                    data.estimatedHeight = 155;
                    data.estimatedWeight = 55;
                }
                data.heightConfidence = 0.1;
                data.weightConfidence = 0.1;
            }

            data.bmi = parseFloat(bmi.toFixed(1));
        }

        // Build structured confidence object for frontend
        data.confidence = {
            age: data.ageConfidence || 0.5,
            gender: data.genderConfidence || 0.5,
            height: data.heightConfidence || 0.2,
            weight: data.weightConfidence || 0.2,
        };

        // Clean up flat confidence fields
        delete data.ageConfidence;
        delete data.genderConfidence;
        delete data.heightConfidence;
        delete data.weightConfidence;

        res.json(data);
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze face' });
    }
});

export default router;

