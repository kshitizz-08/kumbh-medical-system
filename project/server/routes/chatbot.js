import express from 'express';
import Fuse from 'fuse.js';
import { knowledgeBase } from '../data/knowledgeBase.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Fuse.js options
const fuseOptions = {
    keys: ['keywords', 'id'],
    threshold: 0.4, // Lower is stricter, 0.4 allows for some typos
    distance: 100
};

const fuse = new Fuse(knowledgeBase, fuseOptions);

// Scoped system context for Gemini fallback — restricts responses to Kumbh Mela medical topics
const GEMINI_SYSTEM_PROMPT = `You are a helpful medical assistant for the Nashik Kumbh Mela 2026 Medical Seva System.

You ONLY answer questions related to:
- Medical emergencies and first aid at Kumbh Mela
- Hospital locations, ambulance services, and medical camp details
- Common health issues at mass gatherings (heat stroke, dehydration, crowd injuries, infections)
- Patient registration and the medical system's features
- Water safety, food hygiene, and sanitation tips for pilgrims
- Weather-related health precautions

RULES:
1. If the user asks something OUTSIDE these topics, politely redirect them: "I'm a medical assistant for Kumbh Mela. I can help with health-related questions. How can I assist you medically?"
2. Keep responses concise (2-3 sentences max) unless the user asks for detail.
3. Always prioritize safety — if someone describes an emergency, tell them to call 108 (ambulance) immediately.
4. Respond in the same language the user writes in (English, Hindi, or Marathi).`;

// POST /api/chatbot/message
router.post('/message', async (req, res) => {
    try {
        const { message, language = 'en', history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await generateResponse(message, language, history);

        res.json({
            response,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

async function generateResponse(message, language, history = []) {
    // 1. Search Knowledge Base using Fuse.js (fast, free)
    const results = fuse.search(message);

    // 2. If match found, return directly
    if (results.length > 0 && results[0].score < 0.35) {
        const match = results[0].item;
        return match.answer[language] || match.answer['en'];
    }

    // 3. Gemini fallback — for questions outside the knowledge base
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (apiKey) {
        try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                systemInstruction: GEMINI_SYSTEM_PROMPT,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 300,
                },
            });

            // Build conversation history for context
            const chatHistory = history.slice(-6).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            }));

            const chat = model.startChat({ history: chatHistory });
            const result = await chat.sendMessage(message);
            const geminiResponse = result.response.text().trim();

            if (geminiResponse) {
                return geminiResponse;
            }
        } catch (err) {
            console.warn('Gemini chatbot fallback failed:', err.message);
        }
    }

    // 4. Static fallback if Gemini also fails
    const fallbacks = {
        en: "I'm not sure about that. I can help with: Emergency contacts, Hospital locations, Heat stroke, or Registration. You can type 'Help' to see options.",
        hi: "मुझे इसके बारे में निश्चित नहीं है। मैं मदद कर सकता हूँ: आपातकालीन संपर्क, अस्पताल के स्थान, गर्मी की बीमारी, या पंजीकरण। विकल्प देखने के लिए 'मदद' टाइप करें।",
        mr: "मला याबद्दल खात्री नाही. मी मदत करू शकतो: आपत्कालीन संपर्क, रुग्णालयाची ठिकाणे, उष्माघात किंवा नोंदणी. पर्याय पाहण्यासाठी 'मदद' टाइप करा."
    };

    return fallbacks[language] || fallbacks['en'];
}

export default router;

