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
            // Mock response for development/demo
            return res.json({
                age: 25,
                gender: 'male',
                estimatedHeight: 170,
                estimatedWeight: 65,
                mock: true
            });
        }

        // Remove data:image/jpeg;base64, prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // List of models to try in order of preference/likelihood of free tier availability
        const modelsToTry = [
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-1.5-flash"
        ];

        let result = null;
        let lastError = null;

        const prompt = `Analyze this image of a person. Estimate their:
        1. Age (number)
        2. Gender ('male' or 'female')
        3. Height in cm (number)
        4. Weight in kg (number)
        
        Provide your best guess based on visual cues.
        Return ONLY valid JSON with keys: age, gender, estimatedHeight, estimatedWeight. Do not use markdown code blocks.`;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
            }
        };

        // Try models sequentially
        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting analysis with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, imagePart]);
                console.log(`Success with model: ${modelName}`);
                break;
            } catch (error) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (!result) {
            throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
        }

        const responseText = result.response.text();

        // Clean up response if it wraps in markdown
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        res.json(data);
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze face' });
    }
});

export default router;
