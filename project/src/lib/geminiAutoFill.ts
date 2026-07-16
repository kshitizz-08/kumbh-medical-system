import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { CreateDevoteePayload } from './api';

export type AutoFillResult = Partial<
  Pick<
    CreateDevoteePayload,
    | 'full_name'
    | 'age'
    | 'gender'
    | 'phone'
    | 'emergency_contact_name'
    | 'emergency_contact_phone'
    | 'blood_group'
    | 'allergies'
    | 'chronic_conditions'
    | 'current_medications'
    | 'past_surgeries'
    | 'special_notes'
    | 'height_cm'
    | 'weight_kg'
  >
>;

// ─────────────────────────────────────────────────────────────────────────────
// Structured JSON schema for Gemini — guarantees valid output format
// ─────────────────────────────────────────────────────────────────────────────
const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    full_name:               { type: SchemaType.STRING,  description: 'Patient full name', nullable: true },
    age:                     { type: SchemaType.INTEGER, description: 'Age in years', nullable: true },
    gender:                  { type: SchemaType.STRING,  description: 'Gender: Male, Female, or Other', nullable: true },
    phone:                   { type: SchemaType.STRING,  description: 'Phone number (digits only)', nullable: true },
    emergency_contact_name:  { type: SchemaType.STRING,  description: 'Emergency contact name', nullable: true },
    emergency_contact_phone: { type: SchemaType.STRING,  description: 'Emergency contact phone (digits only)', nullable: true },
    blood_group:             { type: SchemaType.STRING,  description: 'Blood group: A+, A-, B+, B-, AB+, AB-, O+, O-', nullable: true },
    allergies:               { type: SchemaType.STRING,  description: 'Comma-separated allergy list', nullable: true },
    chronic_conditions:      { type: SchemaType.STRING,  description: 'Comma-separated condition list', nullable: true },
    current_medications:     { type: SchemaType.STRING,  description: 'Comma-separated medication list', nullable: true },
    past_surgeries:          { type: SchemaType.STRING,  description: 'Comma-separated surgery list', nullable: true },
    special_notes:           { type: SchemaType.STRING,  description: 'Any other important medical details', nullable: true },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Few-Shot extraction prompt — multilingual, with worked examples
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a highly accurate medical data extraction engine for the Nashik Kumbh Mela Medical System.

Your ONLY job: analyze the spoken text — which was captured via a speech-to-text (STT) engine — and extract EVERY piece of medical and personal information.
The text may be in English, Hindi, Marathi, or a MIX of all three (code-mixing is normal in India).

CRITICAL: The input is SPOKEN text from a microphone, so:
- Words may be transcribed phonetically, not correctly spelled (e.g. "aay positive" = "A positive", "bee negative" = "B negative", "oh positive" = "O positive").
- Numbers may appear as words instead of digits ("fifty five" = 55, "nine eight seven six" = 9876).
- Filler words may appear: um, uh, er, like, you know, so.
- Punctuation is unreliable — do NOT depend on commas or periods.
- The speaker may say "my blood is bee positive" meaning "B positive".
- Phonetic letters: "aye" or "hey" = A, "bee" = B, "oh" or "owe" = O, "ay bee" or "aybee" = AB.

RULES:
1. Extract EVERY field that is mentioned, even partially.
2. For unknown/missing fields, return null.
3. Normalize phone numbers to digits only (10 digits for Indian numbers).
4. Normalize gender to exactly "Male", "Female", or "Other".
5. Normalize blood group to exactly one of: A+, A-, B+, B-, AB+, AB-, O+, O-.
6. Convert spoken number-words to actual numbers (e.g. "fifty five" → 55).
7. Correct obvious STT phonetic errors using medical/personal context.
8. Remove filler words (um, uh, er, like) from extracted fields.
9. For names: capitalize each word properly. Remove trailing words like "hai", "aahe", "is".

EXTRACTION GUIDE (keywords to recognize across languages):
- Name: "my name is", "i am", "naam hai", "मेरा नाम", "माझे नाव", "call me", "patient name"
- Age: "X years old", "X saal", "X varsh", "X वर्षे", "उमर X", "aged X", "I am X"
- Gender: Male = "male/man/purush/पुरुष/gents/boy", Female = "female/woman/mahila/महिला/stri/स्त्री/lady"
- IMPORTANT: "mail" or "mail mail" = Male (STT mishears "male" as "mail" constantly)
- Phone: "phone/mobile/contact/number X", any 10-digit number, spoken digit sequences
- Blood Group: "A/B/AB/O positive/negative", "aay pos", "bee neg", "raktgat", "रक्तगट", "rakt samuh"
- Height: "height X cm", "X centimeters tall", "I am X cm", "uchi X", "X feet" (convert: feet×30.48)
- Weight: "weight X kg", "X kilos", "X kilogram", "wajan X"
- Conditions: "diabetes/sugar/मधुमेह", "BP/hypertension/उच्च रक्तदाब", "asthma/dama/दमा", "heart/हृदय", "thyroid/थायरॉईड", "kidney/किडनी"
- Allergies: "dust/dhul/धूळ", "peanut/shengdana/मूंगफली", "milk/doodh", "penicillin", "allergic to X"
- Medications: "tablet/medicine/dawa/dawai/aushadh" + drug name, "taking X", "on X medication"
- Surgeries: "surgery/operation/shastrakraya" + description, "had X done", "operated for X"
- Emergency contact: "emergency contact/sambandhi/relative/family" + name and phone

CRITICAL: A pilgrim at Kumbh Mela might need emergency care. Every detail matters. When in doubt, extract rather than omit.`;

// ─────────────────────────────────────────────────────────────────────────────
// Few-Shot examples — 5 realistic multilingual transcripts
// ─────────────────────────────────────────────────────────────────────────────
const FEW_SHOT_EXAMPLES = [
  {
    input: `Mera naam Rajesh Kumar hai, age 52 saal, male. Phone number 9876543210. Blood group B positive. 
Mujhe diabetes hai aur high BP bhi hai. Metformin 500mg aur Amlodipine 5mg le raha hoon. 
Emergency contact meri wife Sunita hai, unka phone 9123456780. Peanut allergy hai mujhe.
2019 mein appendix ka operation hua tha.`,
    output: { full_name: "Rajesh Kumar", age: 52, gender: "Male", phone: "9876543210", blood_group: "B+", chronic_conditions: "Diabetes, Hypertension (High BP)", current_medications: "Metformin 500mg, Amlodipine 5mg", emergency_contact_name: "Sunita", emergency_contact_phone: "9123456780", allergies: "Peanuts", past_surgeries: "Appendix (2019)", special_notes: null }
  },
  {
    input: `माझे नाव सुनंदा पाटील, वय ६५ वर्षे, महिला. फोन 8899776655. रक्तगट O positive.
मला दमा आहे आणि thyroid चा त्रास आहे. Levothyroxine घेते रोज. 
शेंगदाणे आणि धूळ allergy आहे. 
Emergency contact माझा मुलगा विकास, त्यांचा phone 7766554433.
गेल्या वर्षी cataract चे operation झाले.`,
    output: { full_name: "Sunanda Patil", age: 65, gender: "Female", phone: "8899776655", blood_group: "O+", chronic_conditions: "Asthma, Thyroid Disorder", current_medications: "Levothyroxine", allergies: "Peanuts, Dust", emergency_contact_name: "Vikas", emergency_contact_phone: "7766554433", past_surgeries: "Cataract surgery (last year)", special_notes: null }
  },
  {
    input: `My name is Aisha Khan, I am 34 years old, female. My phone is 7788990011.
Blood group AB negative. I have no chronic conditions but I am allergic to penicillin and shellfish.
Currently taking no medications. My husband Farhan is my emergency contact, his number is 9900112233.
I had a C-section two years ago. I am also hearing impaired, please note.`,
    output: { full_name: "Aisha Khan", age: 34, gender: "Female", phone: "7788990011", blood_group: "AB-", chronic_conditions: null, current_medications: null, allergies: "Penicillin, Shellfish", emergency_contact_name: "Farhan", emergency_contact_phone: "9900112233", past_surgeries: "C-section (2 years ago)", special_notes: "Hearing impaired" }
  },
  {
    input: `Patient name Ramchandra Yadav, 78 saal, male. Phone 6677889900. O negative blood group.
Heart disease hai, diabetes bhi, kidney problem bhi shuru ho gayi hai. 
Aspirin, Insulin injection, aur Losartan le rahe hain. Bypass surgery 2018 mein hua tha, 
knee replacement bhi 2020 mein hua. Milk allergy hai. Wheelchair user hain. 
Beta Suresh ka number 8811223344, emergency contact.`,
    output: { full_name: "Ramchandra Yadav", age: 78, gender: "Male", phone: "6677889900", blood_group: "O-", chronic_conditions: "Heart Disease, Diabetes, Kidney Disease", current_medications: "Aspirin, Insulin, Losartan", allergies: "Dairy/Milk", emergency_contact_name: "Suresh", emergency_contact_phone: "8811223344", past_surgeries: "Bypass surgery (2018), Knee replacement (2020)", special_notes: "Wheelchair user" }
  },
  {
    input: `naam Priya hai mera, 28 years old female. contact number 9988776655. 
blood group A positive. koi beemar nahi, koi allergy nahi, koi dawai nahi.
mummy ka naam Rekha hai emergency ke liye, phone 9876501234.`,
    output: { full_name: "Priya", age: 28, gender: "Female", phone: "9988776655", blood_group: "A+", chronic_conditions: null, current_medications: null, allergies: null, emergency_contact_name: "Rekha", emergency_contact_phone: "9876501234", past_surgeries: null, special_notes: null }
  }
];

// ─────────────────────────────────────────────────────────────────────────────

export async function parseVoiceToFormData(transcript: string): Promise<AutoFillResult> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

  console.log('[VoiceAutoFill] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[VoiceAutoFill] Transcript:', transcript);
  console.log('[VoiceAutoFill] API key present:', !!apiKey);

  if (!apiKey) {
    console.warn('[VoiceAutoFill] No API key — using local fallback');
    return enhancedLocalParse(transcript);
  }

  // Models ordered by preference: best accuracy first
  const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

  for (const modelName of modelNames) {
    try {
      console.log(`[VoiceAutoFill] Trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          // Structured JSON output — guarantees valid JSON every time
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      // Build few-shot conversation as prompt parts
      const fewShotParts: string[] = [];
      for (const example of FEW_SHOT_EXAMPLES) {
        fewShotParts.push(`SPOKEN TEXT: "${example.input}"\nEXTRACTED JSON: ${JSON.stringify(example.output)}`);
      }

      const fullPrompt = `Here are examples of correct extractions:\n\n${fewShotParts.join('\n\n---\n\n')}\n\n---\n\nNow extract from this spoken text:\n\nSPOKEN TEXT: "${transcript}"`;

      const result = await model.generateContent(fullPrompt);
      const rawText = result.response.text().trim();

      console.log('[VoiceAutoFill] Raw response:', rawText);

      // With structured output mode, this should always be valid JSON
      const parsed = safeParseJson(rawText);
      if (parsed) {
        const sanitized = sanitizeResult(parsed);
        console.log('[VoiceAutoFill] ✅ Extracted fields:', Object.keys(sanitized));
        console.log('[VoiceAutoFill] Values:', sanitized);
        return sanitized;
      } else {
        console.warn('[VoiceAutoFill] JSON parse failed, trying next model');
      }
    } catch (err: any) {
      console.warn(`[VoiceAutoFill] Model ${modelName} error:`, err?.message || err);
    }
  }

  console.warn('[VoiceAutoFill] All Gemini models failed — using local fallback');
  return enhancedLocalParse(transcript);
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe JSON parsing — with structured output, this is mostly a safety net
// ─────────────────────────────────────────────────────────────────────────────
function safeParseJson(text: string): any | null {
  // 1. Direct parse (should work with structured output mode)
  try { return JSON.parse(text); } catch {}

  // 2. Strip any accidental markdown fences
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
  try { return JSON.parse(stripped); } catch {}

  // 3. Find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
    try {
      const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch {}
  }

  console.warn('[VoiceAutoFill] Failed to parse JSON from text:', text.slice(0, 200));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanitize & validate Gemini output
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeResult(raw: any): AutoFillResult {
  const result: AutoFillResult = {};

  if (typeof raw.full_name === 'string' && raw.full_name.trim()) {
    result.full_name = raw.full_name.trim();
  }
  const rawAge = typeof raw.age === 'number' ? raw.age : parseInt(String(raw.age), 10);
  if (!isNaN(rawAge) && rawAge > 0 && rawAge < 130) {
    result.age = Math.round(rawAge);
  }
  if (raw.gender === 'Male' || raw.gender === 'Female' || raw.gender === 'Other') {
    result.gender = raw.gender;
  }
  if (raw.phone !== undefined && raw.phone !== null) {
    const digits = String(raw.phone).replace(/\D/g, '');
    if (digits.length >= 7) result.phone = digits;
  }
  if (typeof raw.emergency_contact_name === 'string' && raw.emergency_contact_name.trim()) {
    result.emergency_contact_name = raw.emergency_contact_name.trim();
  }
  if (raw.emergency_contact_phone !== undefined && raw.emergency_contact_phone !== null) {
    const digits = String(raw.emergency_contact_phone).replace(/\D/g, '');
    if (digits.length >= 7) result.emergency_contact_phone = digits;
  }
  const validBG = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (validBG.includes(raw.blood_group)) {
    result.blood_group = raw.blood_group;
  }
  for (const field of ['allergies', 'chronic_conditions', 'current_medications', 'past_surgeries', 'special_notes'] as const) {
    if (typeof raw[field] === 'string' && raw[field].trim()) {
      result[field] = raw[field].trim();
    } else if (Array.isArray(raw[field]) && raw[field].length > 0) {
      result[field] = (raw[field] as string[]).join(', ');
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced local fallback — works without Gemini, handles Eng/Hindi/Marathi
// ─────────────────────────────────────────────────────────────────────────────
function enhancedLocalParse(transcript: string): AutoFillResult {
  const result: AutoFillResult = {};
  const t = transcript;
  const tl = transcript.toLowerCase();

  // ── Pre-process: convert spoken number words to digits (for English STT) ──
  const numberWords: Record<string, number> = {
    'zero':0,'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,
    'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,
    'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,
    'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50,
    'sixty':60,'seventy':70,'eighty':80,'ninety':90,'hundred':100,
  };
  const tNorm = tl.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/g,
    (m) => String(numberWords[m] ?? m)
  );

  // ── Full Name ──
  const namePat = [
    /(?:my name is|i am|i'm|name is|naam hai|mera naam|maza nav|naam:?|call me|patient name\s*[:\-]?)\s+([A-Za-zÀ-ÿ][a-zA-ZÀ-ÿ\s]{1,35})(?:\s*[,.]|\s+(?:age|\d|and|ka|ki|che|ahe|i am|aged))/i,
    /(?:patient(?:'s)? name)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,30})/i,
    // English: "it's [Name]" or "this is [Name]"
    /(?:it'?s|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*[,.]?/i,
  ];
  for (const pat of namePat) {
    const m = t.match(pat);
    if (m) {
      let name = m[1].trim();
      // Remove trailing honorifics or filler words
      name = name.replace(/\s+(hai|aahe|ahe|is|here|speaking)$/i, '').trim();
      result.full_name = name;
      break;
    }
  }
  // Last resort: first capitalized word sequence at start of transcript
  if (!result.full_name) {
    const fw = t.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (fw && fw[1].length > 2) result.full_name = fw[1];
  }

  // ── Age ── (use normalized text for word-to-number conversion)
  const agePat = [
    /\b(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|saal\s*ka|saal|varsh|वर्ष|साल|वय)\b/i,
    /(?:age|umar|vay|ayu|aged)\s*(?:is\s*|:?\s*)(\d{1,3})/i,
    /\b(\d{1,3})\s*(?:year|year-old|yo)\b/i,
    // From normalized text (number words converted)
    /\b(\d{1,3})\s*(?:years?\s*old|yrs?)\b/i,
  ];
  for (const pat of agePat) {
    const m = tNorm.match(pat);
    if (m) { result.age = parseInt(m[1]); break; }
  }

  // ── Gender ── (also use tNorm so "mail" pre-corrected to "male" is caught)
  // "mail" is the most common STT mishearing for "male" — handled by normalization above
  const tlNorm = tNorm; // already lowercased
  if (/\b(female|woman|lady|aurat|mahila|स्त्री|महिला|stri|girl|she\/her|fee\s*m[ae]il?|femail)\b/i.test(tl)) result.gender = 'Female';
  else if (/\b(male|mail|man|purush|पुरुष|gents|he\/him|m[ae]il)\b/i.test(tl) || /\b(male|mail|man)\b/i.test(tlNorm)) result.gender = 'Male';
  else if (/\b(other|non.?binary|transgender|trans)\b/i.test(tl)) result.gender = 'Other';

  // ── Phone ── (use normalized text so spoken digits "nine eight..." become numbers)
  const phones = [...tNorm.matchAll(/\b(\d{10})\b/g)].map(m => m[1]);
  if (!phones.length) {
    // Also try original transcript for digit sequences
    const rawPhones = [...tl.matchAll(/\b(\d{10})\b/g)].map(m => m[1]);
    phones.push(...rawPhones);
  }
  if (phones[0]) result.phone = phones[0];
  if (phones[1]) result.emergency_contact_phone = phones[1];

  // ── Height ──
  const heightPat = [
    /\b(\d{2,3})\s*(?:cm|centimeter|centimetre)\b/i,
    /\b(\d{1})\s*feet?\s*(\d{1,2})\s*(?:inch|in)?/i, // e.g. "5 feet 7 inches" -> 170
  ];
  for (const pat of heightPat) {
    const mh = tNorm.match(pat) || t.match(pat);
    if (mh) {
      if (mh[2]) { // feet + inches
        result.height_cm = Math.round(parseInt(mh[1]) * 30.48 + parseInt(mh[2]) * 2.54);
      } else {
        result.height_cm = parseInt(mh[1]);
      }
      break;
    }
  }

  // ── Weight ──
  const weightPat = /\b(\d{2,3})\s*(?:kg|kilo(?:gram)?s?|kilogram)\b/i;
  const mw = tNorm.match(weightPat) || t.match(weightPat);
  if (mw) result.weight_kg = parseInt(mw[1]);

  // ── Emergency Contact ──
  const ecPat = [
    /(?:emergency contact|sambandhi|relative|family|attender|next\s*of\s*kin)\s*(?:name\s*)?(?:is\s*|:?\s*)([A-Za-z][A-Za-z\s]{2,25}?)(?:\s*[,.]|\s+(?:phone|mobile|contact|\d))/i,
    /contact\s*person\s*(?:is\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  for (const pat of ecPat) {
    const m = t.match(pat);
    if (m) { result.emergency_contact_name = m[1].trim(); break; }
  }

  // ── Blood Group ──
  const bgMap: [RegExp, string][] = [
    [/\bab\s*positive\b|\bab\s*pos\b|\bab\+/i, 'AB+'],
    [/\bab\s*negative\b|\bab\s*neg\b|\bab-/i, 'AB-'],
    [/\ba\s*positive\b|\ba\s*pos\b|\ba\+/i, 'A+'],
    [/\ba\s*negative\b|\ba\s*neg\b|\ba-/i, 'A-'],
    [/\bb\s*positive\b|\bb\s*pos\b|\bb\+/i, 'B+'],
    [/\bb\s*negative\b|\bb\s*neg\b|\bb-/i, 'B-'],
    [/\bo\s*positive\b|\bo\s*pos\b|\bo\+/i, 'O+'],
    [/\bo\s*negative\b|\bo\s*neg\b|\bo-/i, 'O-'],
  ];
  for (const [pat, group] of bgMap) {
    if (pat.test(tl)) { result.blood_group = group as AutoFillResult['blood_group']; break; }
  }

  // ── Chronic Conditions ──
  const conds: string[] = [];
  const condTests: [RegExp, string][] = [
    [/\b(diabet|sugar disease|sugar problem|madhumeh|मधुमेह)\b/i, 'Diabetes'],
    [/\b(hypertension|high\s*bp|high\s*blood\s*pressure|raktadab|उच्च रक्तदाब|उच्च रक्तचाप)\b/i, 'Hypertension (High BP)'],
    [/\b(asthma|dama|दमा|breathing\s*problem|sans\s*ki|श्वास)\b/i, 'Asthma/COPD'],
    [/\b(heart\s*(?:disease|problem|attack)|cardiac|hriday|हृदय|दिल\s*की)\b/i, 'Heart Disease'],
    [/\b(thyroid|थायरॉईड|थायरॉइड)\b/i, 'Thyroid Disorder'],
    [/\b(arthritis|joint\s*pain|sande\s*dukhi|सांधेदुखी|ghutne\s*ka\s*dard)\b/i, 'Arthritis/Joint Pain'],
    [/\b(kidney\s*(?:disease|problem|failure)|mutrapind|मूत्रपिंड|किडनी|nephritis)\b/i, 'Kidney Disease'],
    [/\b(liver\s*(?:disease|problem)|yakrut|यकृत|लीवर|hepatitis)\b/i, 'Liver Disease'],
    [/\b(cancer|karkrog|कर्करोग|कैंसर|tumor)\b/i, 'Cancer'],
    [/\b(stroke|paralysis|ardhangyavay|अर्धांगवायू|lakwa|लकवा)\b/i, 'Stroke/Paralysis'],
    [/\b(depression|anxiety|mental\s*health|avsad|अवसाद|चिंता)\b/i, 'Depression/Anxiety'],
  ];
  for (const [pat, label] of condTests) {
    if (pat.test(tl)) conds.push(label);
  }
  if (conds.length) result.chronic_conditions = conds.join(', ');

  // ── Allergies ──
  const allergyTests: [RegExp, string][] = [
    [/\b(dust\s*allerg|dhul\s*allerg|धूळ|dust)\b/i, 'Dust'],
    [/\b(pollen\s*allerg|parag|परागकण)\b/i, 'Pollen'],
    [/\b(peanut|shengdana|मूंगफली|शेंगदाणे)\b/i, 'Peanuts'],
    [/\b(dairy|milk\s*allerg|doodh|dudh|दूध)\b/i, 'Dairy/Milk'],
    [/\b(shellfish|prawn|crab|shrimp)\b/i, 'Shellfish'],
    [/\b(tree\s*nut|cashew|almond|walnut|kaju|badam|काजू|बदाम)\b/i, 'Tree Nuts'],
    [/\b(egg\s*allerg|anda)\b/i, 'Eggs'],
    [/\b(wheat|gluten|gehun|गहू|गेहूं)\b/i, 'Wheat/Gluten'],
    [/\bsoy(?:a|bean)?\b/i, 'Soy'],
    [/\b(animal|pet\s*allerg|cat\s*allerg|dog\s*allerg|dander)\b/i, 'Animal Dander'],
    [/\b(mold|mould|fungus|burshi|बुरशी|फफूंद)\b/i, 'Mold'],
    [/\b(insect|bee\s*sting|wasp|kida)\b/i, 'Insect Stings'],
    [/\b(medicine\s*allerg|drug\s*allerg|penicillin|dawa\s*allerg)\b/i, 'Medications'],
  ];
  const allergies: string[] = [];
  for (const [pat, label] of allergyTests) {
    if (pat.test(tl)) allergies.push(label);
  }
  if (allergies.length) result.allergies = allergies.join(', ');

  // ── Current Medications ──
  const medKeywords = /\b(metformin|aspirin|amlodipine|atorvastatin|lisinopril|paracetamol|omeprazole|pantoprazole|ramipril|losartan|insulin|warfarin|clopidogrel|levothyroxine|atenolol|amlod|glipizide|glibenclamide|glucophage|januvia|janumet)\b/ig;
  const meds = [...tl.matchAll(medKeywords)].map(m => m[1].charAt(0).toUpperCase() + m[1].slice(1));
  const takingPat = /(?:taking|le\s*raha|khato|lete\s*hain|dawa|tablet|medicine|capsule)\s+([a-z][a-z\s]+?)(?:\s*[,.]|\s+(?:and|aur|ani|for|\d))/gi;
  for (const m of tl.matchAll(takingPat)) {
    const med = m[1].trim();
    if (med.length > 2 && !['the', 'for', 'and', 'or', 'in'].includes(med)) meds.push(med.charAt(0).toUpperCase() + med.slice(1));
  }
  if (meds.length) result.current_medications = [...new Set(meds)].join(', ');

  // ── Past Surgeries ──
  const surgPat = /(?:surgery|operation|shastrakraya|operated|zale|huya)\s+(?:for\s+)?([a-z][a-z\s]+?)(?:\s*[,.]|\s+(?:and|aur|ani|\d{4}))/gi;
  const surgeries: string[] = [];
  for (const m of tl.matchAll(surgPat)) {
    const s = m[1].trim();
    if (s.length > 2) surgeries.push(s.charAt(0).toUpperCase() + s.slice(1));
  }
  const namedSurgs = /\b(bypass|c-?section|cesarean|appendix|hysterectomy|angioplasty|knee\s*replacement|hip\s*replacement|cataract|gallbladder)\b/ig;
  for (const m of tl.matchAll(namedSurgs)) {
    surgeries.push(m[1].charAt(0).toUpperCase() + m[1].slice(1));
  }
  if (surgeries.length) result.past_surgeries = [...new Set(surgeries)].join(', ');

  console.log('[VoiceAutoFill] Local parse result:', result);
  console.log('[VoiceAutoFill] Fields extracted:', Object.keys(result).length);
  return result;
}
