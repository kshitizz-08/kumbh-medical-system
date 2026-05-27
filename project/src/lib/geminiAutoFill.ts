import { GoogleGenerativeAI } from '@google/generative-ai';
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
// The master extraction prompt — exhaustive, multilingual, field-by-field
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a highly accurate medical data extraction engine for the Nashik Kumbh Mela Medical System.

Your ONLY job: analyze the spoken text below and extract EVERY SINGLE piece of medical and personal information mentioned.
The text may be in English, Hindi, Marathi, or a MIX of all three (code-mixing is normal in India). Extract regardless of language.

IMPORTANT RULES:
1. Extract EVERY field that is mentioned, even partially.
2. NEVER leave a field blank if the information was spoken.
3. For unknown/missing fields, simply do NOT include them in the JSON.
4. Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

JSON SCHEMA — return only these keys:
{
  "full_name": string,                // Patient full name
  "age": number,                      // Age in years (integer)
  "gender": "Male"|"Female"|"Other",  // Gender
  "phone": string,                    // Phone (digits only, no spaces)
  "emergency_contact_name": string,   // Emergency contact person's name
  "emergency_contact_phone": string,  // Emergency contact phone (digits only)
  "blood_group": "A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-",
  "allergies": string,                // Comma-separated allergy list
  "chronic_conditions": string,       // Comma-separated condition list
  "current_medications": string,      // Comma-separated medication list
  "past_surgeries": string,           // Comma-separated surgery list
  "special_notes": string             // Any other important medical details
}

EXTRACTION GUIDE (English / Hindi / Marathi keywords to recognize):

full_name:
  - "my name is X", "naam X hai", "naam X", "मेरा नाम X", "माझे नाव X"
  - "patient name is X", "X ka naam", "naam hai X"

age:
  - "X years old", "X saal", "X varsh", "X वर्षे", "X साल", "wayo X", "vay X"
  - "age X", "umar X"

gender:
  - Male: "male", "man", "purush", "पुरुष", "पुरुषी"
  - Female: "female", "woman", "lady", "mahila", "महिला", "stri", "स्त्री", "aurat"
  
phone:
  - "phone X", "mobile X", "contact X", "number X", "fone X"
  - Extract any 10-digit number as phone
  - Convert spoken digits: "nine eight seven six" → "9876"

emergency_contact_name:
  - "emergency contact X", "sambandhi X", "relative X", "family contact X"
  - "X ka contact", "X ke naam se contact karo", "contact person X"
  
emergency_contact_phone:
  - Phone number mentioned right after emergency contact name
  - "emergency number X", "unka phone X", "tyanche phone X"

blood_group:
  - "A positive/negative", "B positive/negative", "AB positive/negative", "O positive/negative"
  - "A posiṭiv", "O negaṭiv", "raktgat A positive", "रक्तगट A+", "blood group X"
  - Hindi: "rakt samuh", Marathi: "rakt gat"

chronic_conditions (extract all mentioned):
  - Diabetes: "diabetes", "sugar", "madhumeh", "मधुमेह", "sugar problem", "BP sugar"
  - Hypertension: "high BP", "high blood pressure", "hypertension", "BP", "raktadab", "उच्च रक्तदाब"
  - Asthma: "asthma", "dama", "दमा", "breathing problem", "श्वासाचा त्रास", "sans ki problem"
  - Heart Disease: "heart disease", "heart problem", "cardiac", "हृदय रोग", "दिल की बीमारी"
  - Thyroid: "thyroid", "थायरॉईड", "थायरॉइड"
  - Arthritis: "arthritis", "joint pain", "sande dukhi", "सांधेदुखी", "ghutne ka dard"
  - Kidney: "kidney disease", "kidney problem", "मूत्रपिंड", "किडनी", "nephritis"
  - Liver: "liver problem", "liver disease", "यकृत", "लीवर", "hepatitis"
  - Cancer: "cancer", "कर्करोग", "कैंसर", "tumor"
  - Stroke: "stroke", "paralysis", "अर्धांगवायू", "laqwa", "लकवा"
  - Depression: "depression", "anxiety", "mental health", "अवसाद", "चिंता"

allergies (extract all mentioned):
  - Dust: "dust allergy", "dhul allergy", "धूळ ऍलर्जी"
  - Pollen: "pollen allergy"
  - Peanuts: "peanut", "shengdana", "मूंगफली", "शेंगदाणे"
  - Dairy/Milk: "milk allergy", "dairy allergy", "doodh", "dudh"
  - Shellfish: "shellfish", "prawn", "crab"
  - Tree Nuts: "tree nuts", "cashew", "almond", "walnut", "kaju", "badam"
  - Eggs: "egg allergy", "anda allergy"
  - Wheat/Gluten: "wheat", "gluten", "gehun"
  - Soy: "soy", "soya"
  - Animal Dander: "animal allergy", "pet allergy", "cat allergy", "dog allergy"
  - Mold: "mold", "fungus", "burti"
  - Insect Stings: "bee sting", "insect bite", "kida"
  - Medications: "medicine allergy", "drug allergy", "penicillin allergy"

current_medications (list all medications mentioned):
  - "tablet X", "medicine X", "dawa X", "le raha hai X", "khato X", "X lete hain"
  - Drug names: Metformin, Amlodipine, Aspirin, Atorvastatin, etc.
  - Dosages if mentioned: "Metformin 500mg"
  - Hindi: "dawai", "dava"  Marathi: "aushadh"

past_surgeries (list all surgeries mentioned):
  - "surgery X", "operation X", "shastrakraya X", "operation hua"
  - "knee surgery", "heart surgery", "appendix", "bypass", "C-section", "cesarean"
  - Hindi: "operation huya"  Marathi: "operation zale"

special_notes:
  - Anything else medically important that doesn't fit above fields
  - "wheelchair user", "hearing impaired", "visually impaired"
  - Any specific medical request or note

CRITICAL: Extract EVERYTHING. A pilgrim at Kumbh Mela might need emergency care. Every detail matters.
Return ONLY the JSON. Nothing else.`;

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

  const modelNames = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];

  for (const modelName of modelNames) {
    try {
      console.log(`[VoiceAutoFill] Trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,        // low temperature = more deterministic
          maxOutputTokens: 1024,
        },
      });

      const fullPrompt = `${SYSTEM_PROMPT}\n\n---\nSPOKEN TEXT TO ANALYZE:\n"${transcript}"\n---\nJSON OUTPUT:`;

      const result = await model.generateContent(fullPrompt);
      const rawText = result.response.text().trim();

      console.log('[VoiceAutoFill] Raw response:', rawText);

      const parsed = extractJsonFromText(rawText);
      if (parsed) {
        const sanitized = sanitizeResult(parsed);
        console.log('[VoiceAutoFill] Final extracted fields:', Object.keys(sanitized));
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
// Robust JSON extraction — handles fences, extra text, malformed output
// ─────────────────────────────────────────────────────────────────────────────
function extractJsonFromText(text: string): any | null {
  // 1. Direct parse
  try { return JSON.parse(text); } catch {}

  // 2. Find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
    // Try to fix trailing commas and re-parse
    try {
      const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch {}
  }

  // 3. Strip markdown fences
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
  try { return JSON.parse(stripped); } catch {}

  // 4. Extract the first valid JSON object character by character
  let braceDepth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (start === -1) start = i;
      braceDepth++;
    } else if (text[i] === '}') {
      braceDepth--;
      if (braceDepth === 0 && start !== -1) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch {}
        break;
      }
    }
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
      // Handle case where Gemini returns an array instead of string
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

  // ── Full Name ──
  const namePat = [
    /(?:my name is|i am|i'm|name is|naam hai|mera naam|maza nav|naam:?)\s+([A-Za-zÀ-ÿ][a-zA-ZÀ-ÿ\s]{1,35})(?:\s*[,.]|\s+(?:age|\d|and|ka|ki|che|ahe))/i,
    /(?:patient(?:'s)? name)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,30})/i,
  ];
  for (const pat of namePat) {
    const m = t.match(pat);
    if (m) { result.full_name = m[1].trim(); break; }
  }
  if (!result.full_name) {
    const fw = t.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (fw) result.full_name = fw[1];
  }

  // ── Age ──
  const agePat = [
    /\b(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|saal\s*ka|saal|varsh|वर्ष|साल|वय)\b/i,
    /(?:age|umar|vay|ayu)\s*(?:is\s*|:?\s*)(\d{1,3})/i,
    /\b(\d{1,3})\s*(?:year|year-old)\b/i,
  ];
  for (const pat of agePat) {
    const m = t.match(pat);
    if (m) { result.age = parseInt(m[1]); break; }
  }

  // ── Gender ──
  if (/\b(female|woman|lady|aurat|mahila|स्त्री|महिला|stri)\b/i.test(tl)) result.gender = 'Female';
  else if (/\b(male|man|purush|पुरुष|gents)\b/i.test(tl)) result.gender = 'Male';

  // ── Phone ──
  // 10-digit sequences
  const phones = [...tl.matchAll(/\b(\d{10})\b/g)].map(m => m[1]);
  if (phones[0]) result.phone = phones[0];
  if (phones[1]) result.emergency_contact_phone = phones[1];

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
  // Also catch "tablet X" or "taking X"
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
  // Named surgeries
  const namedSurgs = /\b(bypass|c-?section|cesarean|appendix|hysterectomy|angioplasty|knee\s*replacement|hip\s*replacement|cataract|gallbladder)\b/ig;
  for (const m of tl.matchAll(namedSurgs)) {
    surgeries.push(m[1].charAt(0).toUpperCase() + m[1].slice(1));
  }
  if (surgeries.length) result.past_surgeries = [...new Set(surgeries)].join(', ');

  console.log('[VoiceAutoFill] Local parse result:', result);
  console.log('[VoiceAutoFill] Fields extracted:', Object.keys(result).length);
  return result;
}
