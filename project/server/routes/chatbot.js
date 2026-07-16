import express from 'express';
import Fuse from 'fuse.js';
import { knowledgeBase } from '../data/knowledgeBase.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ── Fuse.js (looser threshold so more queries hit the KB) ─────────────────────
const fuse = new Fuse(knowledgeBase, {
    keys: ['keywords', 'id'],
    threshold: 0.5,
    distance: 150,
    includeScore: true,
});

// ── System prompt for Gemini ──────────────────────────────────────────────────
const GEMINI_SYSTEM_PROMPT = `You are a smart, friendly AI assistant for the Kumbh Mela 2026 Medical Seva System (Nashik, India).

You can answer ANY question the user asks — general knowledge, health tips, emergency guidance, science, history, etc.

Special rules:
1. If someone describes a medical emergency, ALWAYS say: "Call 108 immediately for an ambulance."
2. Be concise but thorough. Use bullet points for lists.
3. Respond in the same language the user uses (English, Hindi, or Marathi).
4. You may use light markdown: **bold**, *italic*, bullet lists (- item).
5. Do NOT refuse reasonable questions — be helpful like ChatGPT or Gemini.`;

// ── Smart local fallback — handles general questions without any AI API ────────
function smartLocalResponse(message, language) {
    const msg = message.toLowerCase().trim();

    // Help / menu
    if (/^help$|^menu$|^options$|^what can you do|^मदद$|^मेनू$/.test(msg)) {
        return {
            en: `👋 **I can help you with:**\n\n- 🚨 **Emergency** — Call 108, medical crisis help\n- 🏥 **Hospital** — Medical center locations at Kumbh Mela\n- ☀️ **Heat Stroke** — Symptoms and treatment\n- 💧 **Dehydration** — Signs and what to do\n- 🤒 **Fever / Illness** — Common remedies\n- 🤢 **Stomach Issues** — Food safety, diarrhea\n- 📋 **Registration** — How to register in the system\n- 👨‍👩‍👧 **Lost & Found** — Separated from family\n- ⏰ **Timings** — Medical services are 24/7\n\nOr just **ask me anything** — I'll do my best to help!`,
            hi: `👋 **मैं इन विषयों में मदद कर सकता हूं:**\n\n- 🚨 **आपातकाल** — 108 पर कॉल करें\n- 🏥 **अस्पताल** — कुंभ मेला में चिकित्सा केंद्र\n- ☀️ **गर्मी / लू** — लक्षण और उपचार\n- 💧 **पानी की कमी** — डिहाइड्रेशन\n- 📋 **पंजीकरण** — सिस्टम में कैसे रजिस्टर करें\n- 👨‍👩‍👧 **खोया-पाया** — परिवार से बिछड़ना\n\nया कोई भी सवाल पूछें!`,
            mr: `👋 **मी या विषयांमध्ये मदत करू शकतो:**\n\n- 🚨 **आपत्कालीन** — 108 वर कॉल करा\n- 🏥 **रुग्णालय** — कुंभ मेळा वैद्यकीय केंद्रे\n- ☀️ **उष्माघात** — लक्षणे आणि उपचार\n- 📋 **नोंदणी** — प्रणालीमध्ये कसे नोंदणी करावे\n\nकिंवा काहीही विचारा!`,
        }[language] || null;
    }

    // Emergency / first aid
    if (/emergency|first aid|accident|heart attack|collapse|not breathing|unconscious|bleeding|ambulance|108|what (should|do) i do|medical help|आपातकाल|आपत्कालीन|मदद चाहिए/.test(msg)) {
        return {
            en: `🚨 **Medical Emergency at Kumbh Mela — What To Do:**\n\n1. **Call 108 immediately** (free ambulance service)\n2. Stay calm and keep the person still\n3. Move them to shade/cool area if possible\n4. Do NOT give food or water to an unconscious person\n5. Nearest Medical Center: **Godavari Ghat (Sector 1)**\n6. First Aid Booths at: Ram Kund, Tapovan, Panchvati\n\n👮 Kumbh Mela volunteers (orange vests) are also trained for first aid — stop any one of them!`,
            hi: `🚨 **कुंभ मेला में चिकित्सा आपातकाल — क्या करें:**\n\n1. **तुरंत 108 पर कॉल करें** (मुफ्त एम्बुलेंस)\n2. शांत रहें, व्यक्ति को हिलाएं नहीं\n3. छाया में ले जाएं\n4. बेहोश व्यक्ति को पानी न दें\n5. निकटतम चिकित्सा केंद्र: **गोदावरी घाट (सेक्टर 1)**\n\n👮 नारंगी जैकेट वाले स्वयंसेवक प्राथमिक चिकित्सा में प्रशिक्षित हैं!`,
            mr: `🚨 **कुंभ मेळ्यात वैद्यकीय आपत्कालीन — काय करावे:**\n\n1. **ताबडतोब 108 वर कॉल करा** (मोफत रुग्णवाहिका)\n2. शांत राहा, व्यक्तीला हलवू नका\n3. सावलीत न्या\n4. निकटचे वैद्यकीय केंद्र: **गोदावरी घाट (सेक्टर 1)**\n\n👮 केशरी जॅकेट असलेले स्वयंसेवक प्रथमोपचारात प्रशिक्षित आहेत!`,
        }[language] || null;
    }

    // Greetings
    if (/^(hi|hello|hey|namaste|namaskar|hii+|helo|नमस्ते|नमस्कार|हेलो)[\s!]*$/.test(msg)) {
        return {
            en: `Namaste! 🙏 I'm your AI Assistant for Kumbh Mela 2026.\n\nHow can I help you today? You can ask about:\n- 🚨 Medical emergencies\n- 🏥 Hospital locations\n- ☀️ Heat stroke & dehydration\n- 📋 Registration & lost persons\n\nOr type **help** to see all options.`,
            hi: `नमस्ते! 🙏 मैं कुंभ मेला 2026 के लिए आपका AI सहायक हूं।\n\nआज मैं आपकी कैसे मदद कर सकता हूं? **help** टाइप करें सभी विकल्प देखने के लिए।`,
            mr: `नमस्ते! 🙏 मी कुंभ मेळा 2026 साठी तुमचा AI सहाय्यक आहे.\n\nसर्व पर्याय पाहण्यासाठी **help** टाइप करा.`,
        }[language] || null;
    }

    // Thank you
    if (/thank|thanks|thx|धन्यवाद|शुक्रिया|आभार/.test(msg)) {
        return {
            en: `You're welcome! 😊 Stay safe and healthy at Kumbh Mela. For any emergency, remember to call **108**. Is there anything else I can help you with?`,
            hi: `आपका स्वागत है! 😊 कुंभ मेला में सुरक्षित और स्वस्थ रहें। किसी भी आपातकाल के लिए **108** पर कॉल करें।`,
            mr: `स्वागत आहे! 😊 कुंभ मेळ्यात सुरक्षित आणि निरोगी राहा. आपत्कालीन परिस्थितीत **108** वर कॉल करा.`,
        }[language] || null;
    }

    // Fever
    if (/fever|temperature|hot|जुकाम|बुखार|ताप|तापमान/.test(msg)) {
        return {
            en: `🌡️ **Managing Fever:**\n\n- Rest in a cool, shaded area\n- Drink plenty of water or ORS\n- Use a damp cloth on forehead\n- Take paracetamol if available\n- **If fever > 102°F (39°C) or lasts more than 2 days — visit the medical center immediately**\n\nMedical centers are open **24/7** at Godavari Ghat and Ram Kund.`,
            hi: `🌡️ **बुखार में क्या करें:**\n\n- ठंडी छाया में आराम करें\n- पानी या ORS खूब पिएं\n- माथे पर ठंडा कपड़ा रखें\n- पेरासिटामोल लें यदि उपलब्ध हो\n- **बुखार 102°F से ऊपर या 2 दिन से अधिक हो तो तुरंत डॉक्टर के पास जाएं**`,
            mr: `🌡️ **तापावर उपाय:**\n\n- थंड सावलीत विश्रांती घ्या\n- पाणी किंवा ORS भरपूर प्या\n- कपाळावर थंड कापड ठेवा\n- **ताप 102°F पेक्षा जास्त असल्यास तातडीने वैद्यकीय केंद्रात जा**`,
        }[language] || null;
    }

    // Dehydration
    if (/dehydrat|thirst|thirsty|dry|पानी|प्यास|पाणी|तहान/.test(msg)) {
        return {
            en: `💧 **Dehydration Signs & Treatment:**\n\n**Signs:**\n- Dark yellow urine\n- Dry mouth & lips\n- Dizziness or headache\n- No urination for 4+ hours\n\n**Treatment:**\n- Drink ORS (Oral Rehydration Solution)\n- Sip water slowly — don't gulp\n- Eat fruits with high water content (watermelon, cucumber)\n- Avoid alcohol, coffee, and sugary drinks\n\n⚠️ **Severe dehydration → Call 108 or visit medical center**`,
            hi: `💧 **डिहाइड्रेशन के संकेत और उपचार:**\n\n**संकेत:** गहरे पीले मूत्र, सूखा मुंह, चक्कर, 4 घंटे से पेशाब न आना\n\n**उपचार:** ORS पिएं, धीरे-धीरे पानी पिएं, तरबूज/खीरा खाएं\n\n⚠️ **गंभीर डिहाइड्रेशन → 108 पर कॉल करें**`,
            mr: `💧 **डिहायड्रेशन चिन्हे आणि उपचार:**\n\n**चिन्हे:** गडद पिवळ्या रंगाचे मूत्र, कोरडे तोंड, चक्कर\n\n**उपचार:** ORS प्या, हळूहळू पाणी प्या, टरबूज/काकडी खा\n\n⚠️ **तीव्र डिहायड्रेशन → 108 वर कॉल करा**`,
        }[language] || null;
    }

    // CPR / heart attack
    if (/cpr|cardiac|heart attack|chest pain|not breathing|unconscious|faint|collapse|सांस|दिल|बेहोश|बेशुद्ध/.test(msg)) {
        return {
            en: `🚨 **EMERGENCY — Call 108 NOW!**\n\n**While waiting for help:**\n1. Lay the person flat on their back\n2. Check if they are breathing\n3. If not breathing — start CPR:\n   - 30 chest compressions (push hard and fast)\n   - 2 rescue breaths\n   - Repeat until help arrives\n4. Do NOT leave the person alone`,
            hi: `🚨 **तुरंत 108 पर कॉल करें!**\n\n**मदद आने तक:** व्यक्ति को सीधे लेटाएं, सांस चेक करें। न आए तो CPR शुरू करें — 30 बार छाती दबाएं, 2 सांसें दें। अकेला न छोड़ें।`,
            mr: `🚨 **ताबडतोब 108 वर कॉल करा!**\n\nव्यक्तीला सरळ झोपवा, श्वास तपासा. नसल्यास CPR सुरू करा — 30 वेळा छाती दाबा, 2 श्वास द्या. एकटे सोडू नका.`,
        }[language] || null;
    }

    // General health / wellness tips
    if (/healthy|wellness|tips|stay safe|precaution|prevention|निरोगी|स्वास्थ्य|सुरक्षा/.test(msg)) {
        return {
            en: `🌿 **Staying Healthy at Kumbh Mela:**\n\n- 💧 Drink only sealed bottled water or treated water\n- 🧴 Use hand sanitizer before eating\n- 🧢 Wear a hat/cap to protect from sun\n- 👟 Wear comfortable footwear\n- 🍌 Eat light meals — bananas, curd, rice\n- 😴 Rest during peak afternoon heat (12–4 PM)\n- 📍 Always know the nearest medical booth location\n- 📞 Save emergency number **108** on your phone`,
            hi: `🌿 **कुंभ मेला में स्वस्थ रहने के टिप्स:**\n\n- केवल सील बंद पानी पिएं\n- खाने से पहले सैनिटाइजर का उपयोग करें\n- टोपी पहनें धूप से बचाव के लिए\n- दोपहर 12-4 बजे छाया में रहें\n- **108** अपने फोन में सेव करें`,
            mr: `🌿 **कुंभ मेळ्यात निरोगी राहण्याचे टिप्स:**\n\n- फक्त सील केलेले पाणी प्या\n- जेवण्यापूर्वी सॅनिटायझर वापरा\n- टोपी घाला\n- दुपारी 12-4 सावलीत राहा\n- **108** फोनमध्ये सेव्ह करा`,
        }[language] || null;
    }

    // What is Kumbh Mela
    if (/^what is kumbh|^tell me about kumbh|^kumbh mela kya|कुंभ मेला क्या है|कुंभ मेळा काय आहे/.test(msg)) {
        return {
            en: `🙏 **Kumbh Mela** is the world's largest religious gathering, held in Nashik, India. Millions of pilgrims come to bathe in the holy Godavari River.\n\n**Key facts:**\n- Location: Nashik, Maharashtra\n- River: Godavari (Trimbakeshwar)\n- Frequency: Every 12 years (Simhastha Kumbh)\n- Duration: Several weeks\n\nThis medical system is here to keep all pilgrims safe and healthy! 🏥`,
            hi: `🙏 **कुंभ मेला** विश्व का सबसे बड़ा धार्मिक आयोजन है, जो नाशिक, भारत में आयोजित होता है। करोड़ों श्रद्धालु पवित्र गोदावरी नदी में स्नान के लिए आते हैं।`,
            mr: `🙏 **कुंभ मेळा** हे जगातील सर्वात मोठे धार्मिक संमेलन आहे, जे नाशिक, भारत येथे आयोजित केले जाते. कोट्यवधी यात्रेकरू पवित्र गोदावरी नदीत स्नान करण्यासाठी येतात.`,
        }[language] || null;
    }

    return null; // No local match — will try Gemini or final fallback
}

// ── POST /api/chatbot/message ─────────────────────────────────────────────────
router.post('/message', async (req, res) => {
    try {
        const { message, language = 'en', history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await generateResponse(message, language, history);
        res.json({ response, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

async function generateResponse(message, language, history = []) {
    // 1. Smart local responses (greetings, help, common medical queries)
    const localAnswer = smartLocalResponse(message, language);
    if (localAnswer) return localAnswer;

    // 2. Fuse.js knowledge base (exact/fuzzy keyword match)
    const results = fuse.search(message);
    if (results.length > 0 && results[0].score < 0.45) {
        const match = results[0].item;
        return match.answer[language] || match.answer['en'];
    }

    // 3. Gemini AI fallback
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (apiKey) {
        try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                systemInstruction: GEMINI_SYSTEM_PROMPT,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            });

            const chatHistory = history.slice(-6).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            }));

            const chat = model.startChat({ history: chatHistory });
            const result = await chat.sendMessage(message);
            const geminiResponse = result.response.text().trim();
            if (geminiResponse) return geminiResponse;
        } catch (err) {
            console.error('Gemini chatbot error:', err.message || err);
            // If API key format issue, log it clearly
            if (err.message && (err.message.includes('API_KEY') || err.message.includes('401') || err.message.includes('403'))) {
                console.error('⚠️  Gemini API key may be invalid or expired. Check your GEMINI_API_KEY in .env');
            }
        }
    }

    // 4. Final intelligent fallback (not a dead-end message)
    const msg = message.toLowerCase();
    if (/\?|what|how|why|when|where|who|explain|tell me|क्या|कैसे|कहाँ|कब|काय|कसे|कुठे/.test(msg)) {
        return {
            en: `I understand you're asking about "${message}". While my AI connection is limited right now, here's what I suggest:\n\n- 🏥 For medical issues — visit the Medical Center at **Godavari Ghat**\n- 🚨 For emergencies — call **108** immediately\n- 👮 For other help — approach any Kumbh Mela volunteer (they wear orange vests)\n\nType **help** to see all topics I can answer locally.`,
            hi: `मैं समझता हूं कि आप "${message}" के बारे में पूछ रहे हैं। अभी AI कनेक्शन सीमित है, लेकिन:\n\n- 🏥 चिकित्सा समस्याओं के लिए — **गोदावरी घाट** पर जाएं\n- 🚨 आपातकाल के लिए — **108** पर कॉल करें\n\n**help** टाइप करें उन विषयों के लिए जो मैं जवाब दे सकता हूं।`,
            mr: `मी समजतो तुम्ही "${message}" बद्दल विचारत आहात. आत्ता AI कनेक्शन मर्यादित आहे:\n\n- 🏥 वैद्यकीय समस्यांसाठी — **गोदावरी घाट** येथे जा\n- 🚨 आपत्कालीनसाठी — **108** वर कॉल करा\n\n**help** टाइप करा.`,
        }[language] || `Type **help** to see what I can assist with. For emergencies, call **108**.`;
    }

    return {
        en: `I'm here to help! 😊 For best results, try asking about:\n- Medical emergencies\n- Hospital locations\n- Heat stroke & dehydration\n- Registration\n\nOr type **help** to see all options.`,
        hi: `मैं यहाँ मदद के लिए हूं! **help** टाइप करें सभी विकल्प देखने के लिए।`,
        mr: `मी मदतीसाठी येथे आहे! **help** टाइप करा सर्व पर्याय पाहण्यासाठी.`,
    }[language] || 'Type **help** to see what I can assist with.';
}

export default router;
