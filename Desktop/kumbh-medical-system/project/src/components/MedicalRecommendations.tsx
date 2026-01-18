import { AlertCircle, CheckCircle, XCircle, Heart, Activity } from 'lucide-react';
import { useI18n, Language } from '../i18n/i18n';

type MedicalRecommendations = {
    dos: string[];
    donts: string[];
    emergencyWarnings: string[];
};

type FormData = {
    allergies: string;
    chronic_conditions: string;
    current_medications: string;
    blood_group: string;
};

// Translation object for medical recommendations
const translations = {
    en: {
        diabetes: {
            dos: [
                'Monitor blood sugar levels regularly (before meals and 2 hours after)',
                'Eat small, frequent meals every 2-3 hours',
                'Include fiber-rich foods like whole grains, vegetables, and legumes',
                'Stay hydrated - drink 8-10 glasses of water daily',
                'Exercise for 30 minutes daily (walking, yoga)'
            ],
            donts: [
                'Skip meals or fast for long periods',
                'Consume sugary drinks, sweets, or refined carbohydrates',
                'Eat white rice, white bread, or processed foods'
            ],
            warnings: [
                'Seek immediate help if blood sugar drops below 70 mg/dL or rises above 300 mg/dL',
                'Watch for symptoms: excessive thirst, frequent urination, blurred vision, fatigue'
            ]
        },
        hypertension: {
            dos: [
                'Monitor blood pressure twice daily (morning and evening)',
                'Limit salt intake to less than 5g per day (1 teaspoon)',
                'Eat potassium-rich foods: bananas, oranges, spinach',
                'Practice stress-reduction techniques: meditation, deep breathing',
                'Maintain healthy weight and exercise regularly'
            ],
            donts: [
                'Add extra salt to food or eat processed/packaged foods',
                'Consume alcohol or caffeinated beverages excessively',
                'Engage in sudden strenuous activities without warm-up'
            ],
            warnings: [
                'Seek immediate help if BP exceeds 180/120 mmHg',
                'Watch for: severe headache, chest pain, shortness of breath, vision problems'
            ]
        },
        asthma: {
            dos: [
                'Keep inhaler accessible at all times',
                'Avoid triggers: dust, smoke, pollution, strong odors',
                'Stay in well-ventilated areas',
                'Practice breathing exercises daily',
                'Get adequate rest and sleep'
            ],
            donts: [
                'Expose yourself to smoke, incense, or air pollution',
                'Exercise in cold, dry air without precautions',
                'Ignore early warning signs like wheezing or chest tightness'
            ],
            warnings: [
                'Use emergency inhaler if severe breathlessness occurs',
                'Seek immediate help if: unable to speak, lips/nails turn blue, inhaler not helping'
            ]
        },
        heart: {
            dos: [
                'Take prescribed medications on time without fail',
                'Monitor heart rate and blood pressure regularly',
                'Follow a low-fat, low-cholesterol diet',
                'Engage in light to moderate exercise as advised by doctor',
                'Manage stress through relaxation techniques'
            ],
            donts: [
                'Consume fatty, fried, or oily foods',
                'Skip medications or alter dosage without consulting doctor',
                'Engage in heavy physical exertion'
            ],
            warnings: [
                'Chest pain, pressure, or discomfort requires immediate medical attention',
                'Call emergency if: severe chest pain, shortness of breath, sweating, nausea'
            ]
        },
        kidney: {
            dos: [
                'Limit protein intake as advised by doctor',
                'Monitor fluid intake carefully',
                'Control blood pressure and blood sugar strictly',
                'Regular kidney function tests as scheduled'
            ],
            donts: [
                'Consume high-potassium foods without doctor approval',
                'Take over-the-counter pain medications (NSAIDs)',
                'Eat processed foods high in phosphorus'
            ],
            warnings: [
                'Reduced urination, severe swelling, or confusion needs immediate attention'
            ]
        },
        allergy: {
            dos: [
                'Carry allergy medication/EpiPen at all times',
                'Inform healthcare providers about all allergies',
                'Read food labels carefully before consumption',
                'Wear medical alert bracelet/card with allergy information'
            ],
            donts: [
                'Try new foods without checking ingredients',
                'Share medications with others or take unfamiliar medicines'
            ],
            warnings: [
                'Seek immediate help for: difficulty breathing, swelling, severe rash, dizziness',
                'Always inform doctors about antibiotic allergy before any treatment'
            ]
        },
        bloodThinner: {
            dos: [
                'Be extra careful to avoid cuts and injuries',
                'Use soft toothbrush to prevent gum bleeding'
            ],
            donts: [
                'Take other medications without consulting doctor',
                'Consume alcohol while on blood thinners'
            ],
            warnings: [
                'Unusual bleeding (nosebleeds, blood in urine/stool) requires immediate attention'
            ]
        },
        multipleMeds: {
            dos: [
                'Maintain a medication schedule/diary',
                'Use pill organizer to avoid missing doses',
                'Regular follow-up with doctor to review medications'
            ]
        },
        general: {
            dos: [
                'Maintain balanced diet with fruits and vegetables',
                'Exercise regularly for at least 30 minutes daily',
                'Stay hydrated - drink 8-10 glasses of water',
                'Get 7-8 hours of quality sleep',
                'Regular health check-ups annually'
            ]
        }
    },
    hi: {
        diabetes: {
            dos: [
                'रक्त शर्करा स्तर नियमित रूप से जांचें (भोजन से पहले और 2 घंटे बाद)',
                'हर 2-3 घंटे में थोड़ा-थोड़ा भोजन करें',
                'फाइबर युक्त खाद्य पदार्थ शामिल करें जैसे साबुत अनाज, सब्जियां और दालें',
                'पर्याप्त पानी पिएं - दैनिक 8-10 गिलास',
                'प्रतिदिन 30 मिनट व्यायाम करें (पैदल चलना, योग)'
            ],
            donts: [
                'भोजन न छोड़ें या लंबे समय तक उपवास न करें',
                'मीठे पेय, मिठाई या रिफाइंड कार्बोहाइड्रेट का सेवन न करें',
                'सफेद चावल, सफेद ब्रेड या प्रसंस्कृत खाद्य पदार्थ न खाएं'
            ],
            warnings: [
                'यदि रक्त शर्करा 70 mg/dL से कम या 300 mg/dL से अधिक हो तो तुरंत सहायता लें',
                'लक्षणों पर ध्यान दें: अत्यधिक प्यास, बार-बार पेशाब, धुंधली दृष्टि, थकान'
            ]
        },
        hypertension: {
            dos: [
                'रक्तचाप दिन में दो बार जांचें (सुबह और शाम)',
                'नमक का सेवन प्रतिदिन 5g (1 चम्मच) से कम रखें',
                'पोटेशियम युक्त खाद्य पदार्थ खाएं: केला, संतरा, पालक',
                'तनाव कम करने की तकनीकें अपनाएं: ध्यान, गहरी सांस लेना',
                'स्वस्थ वजन बनाए रखें और नियमित व्यायाम करें'
            ],
            donts: [
                'भोजन में अतिरिक्त नमक न डालें या प्रसंस्कृत/पैक किया हुआ भोजन न खाएं',
                'शराब या कैफीन युक्त पेय अधिक मात्रा में न लें',
                'बिना वार्म-अप के अचानक कठिन गतिविधियां न करें'
            ],
            warnings: [
                'यदि रक्तचाप 180/120 mmHg से अधिक हो तो तुरंत सहायता लें',
                'सावधान रहें: गंभीर सिरदर्द, सीने में दर्द, सांस लेने में कठिनाई, दृष्टि समस्याएं'
            ]
        },
        asthma: {
            dos: [
                'इनहेलर हमेशा पास रखें',
                'ट्रिगर से बचें: धूल, धुआं, प्रदूषण, तेज गंध',
                'अच्छी हवादार जगह पर रहें',
                'रोजाना सांस लेने की एक्सरसाइज करें',
                'पर्याप्त आराम और नींद लें'
            ],
            donts: [
                'धुएं, अगरबत्ती या वायु प्रदूषण के संपर्क में न आएं',
                'ठंडी, शुष्क हवा में बिना सावधानी के व्यायाम न करें',
                'घरघराहट या सीने में जकड़न जैसे प्रारंभिक लक्षणों को नजरअंदाज न करें'
            ],
            warnings: [
                'गंभीर सांस फूलने पर इमरजेंसी इनहेलर का उपयोग करें',
                'तुरंत सहायता लें यदि: बोलने में असमर्थ, होंठ/नाखून नीले, इनहेलर काम नहीं कर रहा'
            ]
        },
        heart: {
            dos: [
                'निर्धारित दवाएं समय पर बिना नागा लें',
                'हृदय गति और रक्तचाप नियमित रूप से जांचें',
                'कम वसा, कम कोलेस्ट्रॉल वाला आहार लें',
                'डॉक्टर की सलाह के अनुसार हल्का से मध्यम व्यायाम करें',
                'विश्राम तकनीकों से तनाव प्रबंधन करें'
            ],
            donts: [
                'वसायुक्त, तला हुआ या तैलीय भोजन न करें',
                'दवाएं न छोड़ें या डॉक्टर से परामर्श के बिना खुराक न बदलें',
                'भारी शारीरिक परिश्रम न करें'
            ],
            warnings: [
                'सीने में दर्द, दबाव या असुविधा होने पर तुरंत चिकित्सा सहायता लें',
                'आपातकालीन कॉल करें यदि: गंभीर सीने में दर्द, सांस फूलना, पसीना, मतली'
            ]
        },
        kidney: {
            dos: [
                'डॉक्टर की सलाह के अनुसार प्रोटीन सेवन सीमित करें',
                'तरल पदार्थ का सेवन सावधानीपूर्वक मॉनिटर करें',
                'रक्तचाप और रक्त शर्करा को सख्ती से नियंत्रित करें',
                'निर्धारित समय पर किडनी फंक्शन टेस्ट कराएं'
            ],
            donts: [
                'डॉक्टर की मंजूरी के बिना उच्च पोटेशियम वाले खाद्य पदार्थ न खाएं',
                'बिना पर्चे वाली दर्द की दवाएं (NSAIDs) न लें',
                'फॉस्फोरस से भरपूर प्रसंस्कृत खाद्य पदार्थ न खाएं'
            ],
            warnings: [
                'कम पेशाब, गंभीर सूजन या भ्रम होने पर तुरंत ध्यान दें'
            ]
        },
        allergy: {
            dos: [
                'हमेशा एलर्जी की दवा/EpiPen साथ रखें',
                'स्वास्थ्य सेवा प्रदाताओं को सभी एलर्जी के बारे में सूचित करें',
                'खाने से पहले फूड लेबल ध्यान से पढ़ें',
                'एलर्जी जानकारी वाला मेडिकल अलर्ट ब्रेसलेट/कार्ड पहनें'
            ],
            donts: [
                'बिना सामग्री जांचे नए खाद्य पदार्थ न आज़माएं',
                'दूसरों के साथ दवाएं साझा न करें या अपरिचित दवाएं न लें'
            ],
            warnings: [
                'तुरंत सहायता लें: सांस लेने में कठिनाई, सूजन, गंभीर दाने, चक्कर',
                'किसी भी उपचार से पहले डॉक्टरों को एंटीबायोटिक एलर्जी के बारे में सूचित करें'
            ]
        },
        bloodThinner: {
            dos: [
                'कटने और चोट से बचने के लिए अतिरिक्त सावधान रहें',
                'मसूड़ों से खून बहने से रोकने के लिए मुलायम टूथब्रश का उपयोग करें'
            ],
            donts: [
                'डॉक्टर से परामर्श के बिना अन्य दवाएं न लें',
                'रक्त पतला करने वाली दवा लेते समय शराब का सेवन न करें'
            ],
            warnings: [
                'असामान्य रक्तस्राव (नाक से खून, मूत्र/मल में रक्त) पर तुरंत ध्यान दें'
            ]
        },
        multipleMeds: {
            dos: [
                'दवा अनुसूची/डायरी बनाए रखें',
                'खुराक न चूकने के लिए पिल ऑर्गनाइज़र का उपयोग करें',
                'दवाओं की समीक्षा के लिए डॉक्टर से नियमित फॉलो-अप करें'
            ]
        },
        general: {
            dos: [
                'फलों और सब्जियों के साथ संतुलित आहार बनाए रखें',
                'कम से कम 30 मिनट प्रतिदिन नियमित व्यायाम करें',
                'हाइड्रेटेड रहें - 8-10 गिलास पानी पिएं',
                '7-8 घंटे की गुणवत्तापूर्ण नींद लें',
                'वार्षिक स्वास्थ्य जांच नियमित रूप से कराएं'
            ]
        }
    },
    mr: {
        diabetes: {
            dos: [
                'रक्तातील साखरेची पातळी नियमितपणे तपासा (जेवणाआधी आणि 2 तासांनंतर)',
                'दर 2-3 तासांनी थोडे-थोडे जेवण करा',
                'फायबरयुक्त पदार्थ घ्या जसे की संपूर्ण धान्ये, भाज्या आणि डाळी',
                'पुरेसे पाणी प्या - दररोज 8-10 ग्लास',
                'दररोज 30 मिनिटे व्यायाम करा (चालणे, योग)'
            ],
            donts: [
                'जेवण वगळू नका किंवा दीर्घकाळ उपवास करू नका',
                'साखरेचे पेय, गोड पदार्थ किंवा रिफाइंड कार्बोहायड्रेट्स घेऊ नका',
                'पांढरा तांदूळ, पांढरी ब्रेड किंवा प्रक्रिया केलेले पदार्थ खाऊ नका'
            ],
            warnings: [
                'रक्तातील साखर 70 mg/dL पेक्षा कमी किंवा 300 mg/dL पेक्षा जास्त असल्यास ताबडतोब मदत घ्या',
                'लक्षणे लक्षात ठेवा: अतिरिक्त तहान, वारंवार लघवी, अंधुक दृष्टी, थकवा'
            ]
        },
        hypertension: {
            dos: [
                'रक्तदाब दिवसातून दोनदा तपासा (सकाळी आणि संध्याकाळी)',
                'मीठ सेवन दररोज 5g (1 चमचा) पेक्षा कमी ठेवा',
                'पोटॅशियमयुक्त पदार्थ घ्या: केळी, संत्री, पालक',
                'तणावमुक्तीचे तंत्र वापरा: ध्यान, खोल श्वास',
                'निरोगी वजन राखा आणि नियमित व्यायाम करा'
            ],
            donts: [
                'जेवणात अतिरिक्त मीठ घालू नका किंवा प्रक्रिया केलेले/पॅक केलेले अन्न खाऊ नका',
                'दारू किंवा कॅफीनयुक्त पेये जास्त प्रमाणात घेऊ नका',
                'वॉर्म-अप न करता अचानक कठोर क्रियाकलाप करू नका'
            ],
            warnings: [
                'रक्तदाब 180/120 mmHg पेक्षा जास्त असल्यास ताबडतोब मदत घ्या',
                'सतर्क रहा: तीव्र डोकेदुखी, छातीत वेदना, श्वास घेण्यास त्रास, दृष्टी समस्या'
            ]
        },
        asthma: {
            dos: [
                'इनहेलर नेहमी जवळ ठेवा',
                'ट्रिगर टाळा: धूळ, धूर, प्रदूषण, तीव्र गंध',
                'चांगल्या हवेशीर जागेत रहा',
                'रोज श्वास घेण्याचे व्यायाम करा',
                'पुरेशी विश्रांती आणि झोप घ्या'
            ],
            donts: [
                'धुराचा, धूपाचा किंवा वायू प्रदूषणाच्या संपर्कात येऊ नका',
                'थंड, कोरड्या हवेत सावधगिरीशिवाय व्यायाम करू नका',
                'घरघर किंवा छातीत घट्टपणा यासारखी सुरुवातीची चिन्हे दुर्लक्षित करू नका'
            ],
            warnings: [
                'तीव्र श्वास लागल्यास आपत्कालीन इनहेलर वापरा',
                'ताबडतोब मदत घ्या जर: बोलू शकत नाही, ओठ/नखे निळी, इनहेलर काम करत नाही'
            ]
        },
        heart: {
            dos: [
                'विहित औषधे वेळेवर चुकविूकरता घ्या',
                'हृदयगती आणि रक्तदाब नियमितपणे तपासा',
                'कमी चरबी, कमी कोलेस्टेरॉल असलेला आहार घ्या',
                'डॉक्टरांच्या सल्ल्यानुसार हलका ते मध्यम व्यायाम करा',
                'विश्रांती तंत्रांद्वारे तणाव व्यवस्थापन करा'
            ],
            donts: [
                'चरबीयुक्त, तळलेले किंवा तेलकट पदार्थ खाऊ नका',
                'औषधे वगळू नका किंवा डॉक्टरांशी सल्लामसलत न करता डोस बदलू नका',
                'जास्त शारीरिक श्रम करू नका'
            ],
            warnings: [
                'छातीत वेदना, दाब किंवा अस्वस्थता असल्यास ताबडतोब वैद्यकीय मदत घ्या',
                'आपत्कालीन कॉल करा जर: तीव्र छातीत वेदना, श्वास लागणे, घाम येणे, मळमळ'
            ]
        },
        kidney: {
            dos: [
                'डॉक्टरांच्या सल्ल्यानुसार प्रथिने सेवन मर्यादित करा',
                'द्रव सेवन काळजीपूर्वक मॉनिटर करा',
                'रक्तदाब आणि रक्तातील साखर कठोरपणे नियंत्रित करा',
                'नियोजित वेळी मूत्रपिंड कार्य चाचण्या करा'
            ],
            donts: [
                'डॉक्टरांच्या मान्यतेशिवाय उच्च पोटॅशियम असलेले पदार्थ खाऊ नका',
                'ओव्हर-द-काउंटर वेदना औषधे (NSAIDs) घेऊ नका',
                'फॉस्फरसयुक्त प्रक्रिया केलेले पदार्थ खाऊ नका'
            ],
            warnings: [
                'कमी लघवी, तीव्र सूज किंवा गोंधळ यांना ताबडतोब लक्ष द्या'
            ]
        },
        allergy: {
            dos: [
                'नेहमी ऍलर्जी औषध/EpiPen सोबत ठेवा',
                'आरोग्य सेवा प्रदात्यांना सर्व ऍलर्जीबद्दल माहिती द्या',
                'खाण्यापूर्वी अन्न लेबल काळजीपूर्वक वाचा',
                'ऍलर्जी माहितीसह मेडिकल अलर्ट ब्रेसलेट/कार्ड घाला'
            ],
            donts: [
                'घटक तपासल्याशिवाय नवीन पदार्थ चाखू नका',
                'इतरांसोबत औषधे शेअर करू नका किंवा अपरिचित औषधे घेऊ नका'
            ],
            warnings: [
                'ताबडतोब मदत घ्या: श्वास घेण्यास त्रास, सूज, तीव्र पुरळ, चक्कर येणे',
                'कोणत्याही उपचारापूर्वी डॉक्टरांना प्रतिजैविक ऍलर्जीबद्दल नेहमी सूचित करा'
            ]
        },
        bloodThinner: {
            dos: [
                'कट आणि जखमा टाळण्यासाठी अतिरिक्त सावधगिरी बाळगा',
                'हिरड्यांतून रक्तस्त्राव टाळण्यासाठी मऊ टूथब्रश वापरा'
            ],
            donts: [
                'डॉक्टरांशी सल्लामसलत न करता इतर औषधे घेऊ नका',
                'रक्त पातळ करणारी औषधे घेत असताना दारू सेवन करू नका'
            ],
            warnings: [
                'असामान्य रक्तस्त्राव (नाकातून रक्त, मूत्र/विष्ठेत रक्त) यांना ताबडतोब लक्ष द्या'
            ]
        },
        multipleMeds: {
            dos: [
                'औषध वेळापत्रक/डायरी राखा',
                'डोस चुकवू नयेत म्हणून पिल ऑर्गनायझर वापरा',
                'औषधांच्या पुनरावलोकनासाठी डॉक्टरांशी नियमित फॉलो-अप करा'
            ]
        },
        general: {
            dos: [
                'फळे आणि भाज्यांसह संतुलित आहार ठेवा',
                'किमान 30 मिनिटे दररोज नियमित व्यायाम करा',
                'हायड्रेटेड रहा - 8-10 ग्लास पाणी प्या',
                '7-8 तासांची गुणवत्तापूर्ण झोप घ्या',
                'वार्षिक आरोग्य तपासणी नियमितपणे करा'
            ]
        }
    }
};

// Real medical data-based recommendations with multi-language support
const getMedicalRecommendations = (data: FormData, lang: Language): MedicalRecommendations => {
    const dos: string[] = [];
    const donts: string[] = [];
    const emergencyWarnings: string[] = [];

    const t = translations[lang];
    const conditions = data.chronic_conditions.toLowerCase();
    const allergies = data.allergies.toLowerCase();
    const medications = data.current_medications.toLowerCase();

    // Diabetes recommendations
    if (conditions.includes('diabetes') || conditions.includes('sugar')) {
        dos.push(...t.diabetes.dos);
        donts.push(...t.diabetes.donts);
        emergencyWarnings.push(...t.diabetes.warnings);
    }

    // Hypertension recommendations
    if (conditions.includes('hypertension') || conditions.includes('bp') || conditions.includes('blood pressure')) {
        dos.push(...t.hypertension.dos);
        donts.push(...t.hypertension.donts);
        emergencyWarnings.push(...t.hypertension.warnings);
    }

    // Asthma recommendations
    if (conditions.includes('asthma')) {
        dos.push(...t.asthma.dos);
        donts.push(...t.asthma.donts);
        emergencyWarnings.push(...t.asthma.warnings);
    }

    // Heart disease recommendations
    if (conditions.includes('heart') || conditions.includes('cardiac') || conditions.includes('coronary')) {
        dos.push(...t.heart.dos);
        donts.push(...t.heart.donts);
        emergencyWarnings.push(...t.heart.warnings);
    }

    // Kidney disease recommendations
    if (conditions.includes('kidney') || conditions.includes('renal')) {
        dos.push(...t.kidney.dos);
        donts.push(...t.kidney.donts);
        emergencyWarnings.push(...t.kidney.warnings);
    }

    // Allergy-based recommendations
    if (allergies && allergies !== 'none' && allergies.trim()) {
        dos.push(...t.allergy.dos);
        donts.push(...t.allergy.donts);

        if (allergies.includes('penicillin') || allergies.includes('antibiotic')) {
            emergencyWarnings.push(t.allergy.warnings[1]);
        }
        emergencyWarnings.push(t.allergy.warnings[0]);
    }

    // Blood thinner recommendations
    if (medications.includes('blood thinner') || medications.includes('warfarin') || medications.includes('aspirin')) {
        dos.push(...t.bloodThinner.dos);
        donts.push(...t.bloodThinner.donts);
        emergencyWarnings.push(...t.bloodThinner.warnings);
    }

    // Multiple medications
    if (medications.split(',').length > 3) {
        dos.push(...t.multipleMeds.dos);
    }

    // General recommendations if no specific conditions
    if (dos.length === 0) {
        dos.push(...t.general.dos);
    }

    return { dos, donts, emergencyWarnings };
};

type Props = {
    formData: FormData;
};

export default function MedicalRecommendations({ formData }: Props) {
    const { t, lang } = useI18n();
    const recommendations = getMedicalRecommendations(formData, lang);

    // Don't show if no meaningful data
    if (!formData.chronic_conditions && !formData.allergies && !formData.current_medications) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Emergency Warnings - Most Important */}
            {recommendations.emergencyWarnings.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                {t('medical.emergency')}
                            </h3>
                            <ul className="space-y-2">
                                {recommendations.emergencyWarnings.map((warning, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span className="font-medium">{warning}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Dos and Don'ts Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dos */}
                {recommendations.dos.length > 0 && (
                    <div className="bg-green-50 border border-green-300 rounded-xl p-5">
                        <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            ✓ {t('medical.dos')}
                        </h3>
                        <ul className="space-y-2">
                            {recommendations.dos.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Don'ts */}
                {recommendations.donts.length > 0 && (
                    <div className="bg-orange-50 border border-orange-300 rounded-xl p-5">
                        <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            ✗ {t('medical.donts')}
                        </h3>
                        <ul className="space-y-2">
                            {recommendations.donts.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-600" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Heart className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                    <strong>{t('medical.disclaimer')}</strong> {t('medical.disclaimerText')}
                </p>
            </div>
        </div>
    );
}
