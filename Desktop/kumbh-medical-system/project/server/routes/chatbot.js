import express from 'express';

const router = express.Router();

// System context for the chatbot
const SYSTEM_CONTEXT = `You are a helpful medical assistant for the Nashik Kumbh Mela 2026 Medical Seva System. 
Your role is to provide:
1. Basic medical information and first aid guidance
2. Help locate medical facilities at the Kumbh Mela
3. Answer questions about common health issues at large gatherings
4. Guide users on when to seek immediate medical attention

Important guidelines:
- Always be respectful and empathetic
- For serious medical emergencies, ALWAYS advise to call emergency services or visit the nearest medical center immediately
- Never provide definitive medical diagnoses - only general guidance
- Acknowledge limitations - you're an AI assistant, not a replacement for doctors
- Be aware of Kumbh Mela context: river bathing, large crowds, heat, hygiene
- Support questions in English, Hindi, and Marathi

Available medical centers at Kumbh:
- Main Medical Center: Godavari Ghat
- Emergency services available 24/7
- First aid posts at all major ghats
- Mobile medical units patrolling the area

Common issues at Kumbh: heat stroke, dehydration, minor injuries, stomach issues, exhaustion.`;

// POST /api/chatbot/message
// Send a message to the chatbot
router.post('/message', async (req, res) => {
    try {
        const { message, language = 'en', history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // For now, we'll use a simple rule-based response system
        // In production, integrate with Google Gemini API or OpenAI
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

// Simple rule-based response generator
// TODO: Replace with Google Gemini API integration
async function generateResponse(message, language, history) {
    const lowerMessage = message.toLowerCase();

    // Emergency keywords
    if (
        lowerMessage.includes('emergency') ||
        lowerMessage.includes('आपातकाल') ||
        lowerMessage.includes('urgent') ||
        lowerMessage.includes('critical')
    ) {
        return getTranslatedResponse(
            'emergency',
            language,
            '🚨 This sounds like an emergency! Please call emergency services immediately or visit the nearest medical center at Godavari Ghat. Emergency helpline: 108. Do not delay!'
        );
    }

    // Medical center location
    if (
        lowerMessage.includes('medical center') ||
        lowerMessage.includes('hospital') ||
        lowerMessage.includes('doctor') ||
        lowerMessage.includes('डॉक्टर') ||
        lowerMessage.includes('अस्पताल') ||
        lowerMessage.includes('where')
    ) {
        return getTranslatedResponse(
            'location',
            language,
            'The main medical center is located at Godavari Ghat. We also have first aid posts at all major ghats. Mobile medical units are patrolling the area 24/7. Would you like directions?'
        );
    }

    // Heat stroke / dehydration
    if (
        lowerMessage.includes('heat') ||
        lowerMessage.includes('dehydrat') ||
        lowerMessage.includes('dizzy') ||
        lowerMessage.includes('गर्मी') ||
        lowerMessage.includes('चक्कर')
    ) {
        return getTranslatedResponse(
            'heatstroke',
            language,
            '☀️ Heat exhaustion is common at Kumbh. Immediate steps:\n1. Move to shade immediately\n2. Drink water slowly (not too fast)\n3. Apply cool water on forehead and wrists\n4. Rest and loosen tight clothing\n\nSeek medical help if: severe headache, confusion, vomiting, or unconsciousness. Visit the nearest first aid post!'
        );
    }

    // Stomach issues
    if (
        lowerMessage.includes('stomach') ||
        lowerMessage.includes('diarrhea') ||
        lowerMessage.includes('vomit') ||
        lowerMessage.includes('पेट') ||
        lowerMessage.includes('दस्त')
    ) {
        return getTranslatedResponse(
            'stomach',
            language,
            '🤢 For stomach issues at Kumbh:\n1. Stay hydrated - drink ORS or clean water\n2. Avoid street food temporarily\n3. Eat simple, bland foods (rice, banana)\n4. Wash hands frequently\n\nSeek medical help if: severe pain, blood in stool, high fever, or dehydration symptoms. Visit medical center if symptoms persist for 24+ hours.'
        );
    }

    // First aid
    if (
        lowerMessage.includes('first aid') ||
        lowerMessage.includes('injury') ||
        lowerMessage.includes('cut') ||
        lowerMessage.includes('wound') ||
        lowerMessage.includes('चोट')
    ) {
        return getTranslatedResponse(
            'firstaid',
            language,
            '🩹 For minor injuries:\n1. Clean wound with clean water\n2. Apply antiseptic if available\n3. Cover with clean bandage\n4. Visit first aid post for proper dressing\n\nFor serious injuries (deep cuts, heavy bleeding, broken bones): Go to main medical center immediately. First aid posts are at all major ghats.'
        );
    }

    // Registration / ID
    if (
        lowerMessage.includes('registration') ||
        lowerMessage.includes('register') ||
        lowerMessage.includes('id') ||
        lowerMessage.includes('रजिस्ट्रेशन')
    ) {
        return getTranslatedResponse(
            'registration',
            language,
            '📋 To register as a devotee:\n1. Visit any medical center or registration booth\n2. Bring your ID proof (Aadhar, Passport, etc.)\n3. Take a selfie photo for identification\n4. Provide medical history and emergency contact\n\nRegistration helps us serve you better in emergencies! You\'ll receive a unique Kumbh Medical ID.'
        );
    }

    // COVID / vaccination
    if (
        lowerMessage.includes('covid') ||
        lowerMessage.includes('vaccine') ||
        lowerMessage.includes('vaccination') ||
        lowerMessage.includes('वैक्सीन')
    ) {
        return getTranslatedResponse(
            'covid',
            language,
            '💉 Health precautions at Kumbh:\n1. Maintain hand hygiene\n2. Wear masks in crowded areas if you prefer\n3. Vaccination records are collected during registration\n4. Report any respiratory symptoms to medical staff\n\nStay safe and enjoy the Kumbh Mela!'
        );
    }

    // Greeting
    if (
        lowerMessage.includes('hello') ||
        lowerMessage.includes('hi') ||
        lowerMessage.includes('नमस्ते') ||
        lowerMessage.includes('hey')
    ) {
        return getTranslatedResponse(
            'greeting',
            language,
            'Namaste! 🙏 Welcome to Kumbh Mela Medical Seva. I\'m here to help with medical information and guidance. How can I assist you today?\n\nI can help with:\n- Medical emergencies\n- Finding medical centers\n- First aid advice\n- Health tips for Kumbh\n- Registration information'
        );
    }

    // Default response
    return getTranslatedResponse(
        'default',
        language,
        'I can help you with medical information at Kumbh Mela. Please ask about:\n\n- Medical emergencies 🚨\n- Finding medical centers 🏥\n- First aid guidance 🩹\n- Heat stroke & dehydration ☀️\n- Stomach issues 🤢\n- Registration process 📋\n\nWhat would you like to know?'
    );
}

// Translation helper (basic implementation)
function getTranslatedResponse(type, language, defaultText) {
    // For production, integrate with proper translation API
    // For now, returning English responses
    // You can extend this with Hindi/Marathi translations
    return defaultText;
}

export default router;
