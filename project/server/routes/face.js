import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/analyze', async (req, res) => {
    try {
        const { image } = req.body; // Expecting base64 string
        const apiKey = process.env.FACEPP_API_KEY;
        const apiSecret = process.env.FACEPP_API_SECRET;

        if (!apiKey || !apiSecret) {
            // For development/demo without keys, we can return a mock response or error
            // return res.json({ faces: [{ attributes: { gender: { value: 'Male' }, age: { value: 25 } } }] });
            return res.status(500).json({ error: 'Face API keys not configured' });
        }

        // Remove data:image/jpeg;base64, prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

        const params = new URLSearchParams();
        params.append('api_key', apiKey);
        params.append('api_secret', apiSecret);
        params.append('image_base64', base64Image);
        params.append('return_attributes', 'gender,age,ethnicity');

        // Using Face++ US Endpoint
        const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const data = await response.json();

        if (data.error_message) {
            throw new Error(data.error_message);
        }

        res.json(data);
    } catch (error) {
        console.error('Face API Error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze face' });
    }
});

export default router;
