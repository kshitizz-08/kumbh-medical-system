import express from 'express';
import Fuse from 'fuse.js';
import { knowledgeBase } from '../data/knowledgeBase.js';

const router = express.Router();

// Initialize Fuse.js options
const fuseOptions = {
    keys: ['keywords', 'id'],
    threshold: 0.4, // Lower is stricter, 0.4 allows for some typos
    distance: 100
};

const fuse = new Fuse(knowledgeBase, fuseOptions);

// System context for the chatbot (fallback for LLM if we add it later)
const SYSTEM_CONTEXT = `You are a helpful medical assistant for the Nashik Kumbh Mela 2026 Medical Seva System.`;

// POST /api/chatbot/message
router.post('/message', async (req, res) => {
    try {
        const { message, language = 'en', history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await generateResponse(message, language);

        res.json({
            response,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

async function generateResponse(message, language) {
    // 1. Search Knowledge Base using Fuse.js
    const results = fuse.search(message);

    // 2. If match found
    if (results.length > 0) {
        const match = results[0].item;
        // Return answer in requested language, fallback to English
        return match.answer[language] || match.answer['en'];
    }

    // 3. Fallback / Default response if no match
    const fallbacks = {
        en: "I'm not sure about that. I can help with: Emergency contacts, Hospital locations, Heat stroke, or Registration. You can type 'Help' to see options.",
        hi: "मुझे इसके बारे में निश्चित नहीं है। मैं मदद कर सकता हूँ: आपातकालीन संपर्क, अस्पताल के स्थान, गर्मी की बीमारी, या पंजीकरण। विकल्प देखने के लिए 'मदद' टाइप करें।",
        mr: "मला याबद्दल खात्री नाही. मी मदत करू शकतो: आपत्कालीन संपर्क, रुग्णालयाची ठिकाणे, उष्माघात किंवा नोंदणी. पर्याय पाहण्यासाठी 'मदद' टाइप करा."
    };

    return fallbacks[language] || fallbacks['en'];
}

export default router;
