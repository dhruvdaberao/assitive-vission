export type LanguageCode = 'English' | 'Hindi' | 'Marathi' | 'Tamil' | 'Telugu' | 'Bengali';

export const translations: Record<string, Record<LanguageCode, string>> = {
    welcome_message: {
        English: "Single tap to hear button name. Double tap to open feature.",
        Hindi: "बटन का नाम सुनने के लिए एक बार टैप करें। फीचर खोलने के लिए दो बार टैप करें।",
        Marathi: "बटणाचे नाव ऐकण्यासाठी एकदा टॅप करा. वैशिष्ट्य उघडण्यासाठी दोनदा टॅप करा.",
        Tamil: "பொத்தானின் பெயரைக் கேட்க ஒரு முறை தட்டவும். அம்சத்தைத் திறக்க இருமுறை தட்டவும்.",
        Telugu: "బటన్ పేరు వినడానికి ఒకసారి నొక్కండి. ఫీచర్‌ను తెరవడానికి రెండుసార్లు నొక్కండి.",
        Bengali: "বোতামের নাম শুনতে একবার আলতো চাপুন। বৈশিষ্ট্য খুলতে দুবার আলতো চাপুন।"
    },
    nav_prompt: {
        English: "Where do you want to go?",
        Hindi: "आप कहाँ जाना चाहते हैं?",
        Marathi: "तुम्हाला कुठे जायचे आहे?",
        Tamil: "நீங்கள் எங்கு செல்ல விரும்புகிறீர்கள்?",
        Telugu: "మీరు ఎక్కడికి వెళ్లాలి అనుకుంటున్నారు?",
        Bengali: "আপনি কোথায় যেতে চান?"
    },
    nav_confirm: {
        English: "Navigating to destination. Path clear. Walk forward.",
        Hindi: "गंतव्य की ओर नेविगेट कर रहे हैं। रास्ता साफ है। आगे बढ़ें।",
        Marathi: "गंतव्यस्थानाकडे नेव्हिगेट करत आहे. रस्ता मोकळा आहे. पुढे चाला.",
        Tamil: "இலக்கிற்குச் செல்கிறது. பாதை தெளிவாக உள்ளது. முன்னே செல்லுங்கள்.",
        Telugu: "గమ్యస్థానానికి దారిచూపుతోంది. మార్గం స్పష్టంగా ఉంది. ముందుకు నడవండి.",
        Bengali: "গন্তব্যে নেভিগেট করছে। পথ পরিষ্কার। এগিয়ে যান।"
    },
    nav_fail: {
        English: "No destination detected. Returning to home.",
        Hindi: "कोई गंतव्य नहीं मिला। होम पर लौट रहे हैं।",
        Marathi: "कोणतेही गंतव्यस्थान आढळले नाही. होमवर परत येत आहे.",
        Tamil: "இலக்கு ஏதும் கண்டறியப்படவில்லை. முகப்பிற்குத் திரும்புகிறது.",
        Telugu: "గమ్యస్థానం కనుగొనబడలేదు. హోమ్‌కి తిరిగి వస్తోంది.",
        Bengali: "কোনো গন্তব্য শনাক্ত হয়নি। হোমে ফিরে যাচ্ছে।"
    },
    find_prompt: {
        English: "What are you looking for?",
        Hindi: "आप क्या ढूंढ रहे हैं?",
        Marathi: "तुम्ही काय शोधत आहात?",
        Tamil: "நீங்கள் எதைத் தேடுகிறீர்கள்?",
        Telugu: "మీరు దేని కోసం వెతుకుతున్నారు?",
        Bengali: "আপনি কী খুঁজছেন?"
    },
    find_confirm: {
        English: "Scanning area for object.",
        Hindi: "वस्तु के लिए क्षेत्र स्कैन कर रहे हैं।",
        Marathi: "वस्तूसाठी परिसर स्कॅन करत आहे.",
        Tamil: "பொருளுக்காக பகுதியை ஸ்கேன் செய்கிறது.",
        Telugu: "వస్తువు కోసం ప్రాంతాన్ని స్కాన్ చేస్తోంది.",
        Bengali: "বস্তুর জন্য এলাকা স্ক্যান করা হচ্ছে।"
    },
    find_fail: {
        English: "No object detected. Returning to home.",
        Hindi: "कोई वस्तु नहीं मिली। होम पर लौट रहे हैं।",
        Marathi: "कोणतीही वस्तू आढळली नाही. होमवर परत येत आहे.",
        Tamil: "பொருள் ஏதும் கண்டறியப்படவில்லை. முகப்பிற்குத் திரும்புகிறது.",
        Telugu: "వస్తువు కనుగొనబడలేదు. హోమ్‌కి తిరిగి వస్తోంది.",
        Bengali: "কোনো বস্তু শনাক্ত হয়নি। হোমে ফিরে যাচ্ছে।"
    },
    lang_prompt_1: {
        English: "Do you want to change language? Say yes or no.",
        Hindi: "क्या आप भाषा बदलना चाहते हैं? हाँ या ना कहें।",
        Marathi: "तुम्हाला भाषा बदलायची आहे का? होय किंवा नाही सांगा.",
        Tamil: "மொழியை மாற்ற விரும்புகிறீர்களா? ஆம் அல்லது இல்லை என்று கூறுங்கள்.",
        Telugu: "మీరు భాషను మార్చాలనుకుంటున్నారా? అవును లేదా కాదు అని చెప్పండి.",
        Bengali: "আপনি কি ভাষা পরিবর্তন করতে চান? হ্যাঁ বা না বলুন।"
    },
    lang_prompt_2: {
        English: "Say 1 for Hindi. Say 2 for Marathi. Say 3 for English. Say 4 for Tamil. Say 5 for Telugu. Say 0 to cancel.",
        Hindi: "हिंदी के लिए 1 कहें। मराठी के लिए 2 कहें। अंग्रेजी के लिए 3 कहें। तमिल के लिए 4 कहें। तेलुगु के लिए 5 कहें। रद्द करने के लिए 0 कहें।",
        Marathi: "हिंदीसाठी 1 सांगा. मराठीसाठी 2 सांगा. इंग्रजीसाठी 3 सांगा. तमिळसाठी 4 सांगा. तेलगूसाठी 5 सांगा. रद्द करण्यासाठी 0 सांगा.",
        Tamil: "இந்திக்கு 1 என்று கூறுங்கள். மராத்திக்கு 2 என்று கூறுங்கள். ஆங்கிலத்திற்கு 3 என்று கூறுங்கள். தமிழுக்கு 4 என்று கூறுங்கள். தெலுங்குக்கு 5 என்று கூறுங்கள். ரத்து செய்ய 0 என்று கூறுங்கள்.",
        Telugu: "హిందీ కోసం 1 అని చెప్పండి. మరాఠీ కోసం 2 అని చెప్పండి. ఇంగ్లీష్ కోసం 3 అని చెప్పండి. తమిళం కోసం 4 అని చెప్పండి. తెలుగు కోసం 5 అని చెప్పండి. రద్దు చేయడానికి 0 అని చెప్పండి.",
        Bengali: "হিন্দির জন্য 1 বলুন। মারাঠির জন্য 2 বলুন। ইংরেজির জন্য 3 বলুন। তামিলের জন্য 4 বলুন। তেলুগুর জন্য 5 বলুন। বাতিল করতে 0 বলুন।"
    },
    lang_cancelled: {
        English: "Cancelled.",
        Hindi: "रद्द किया गया।",
        Marathi: "रद्द केले.",
        Tamil: "ரத்து செய்யப்பட்டது.",
        Telugu: "రద్దు చేయబడింది.",
        Bengali: "বাতিল করা হয়েছে।"
    },
    lang_invalid_1: {
        English: "Invalid selection. Please say a number between 1 and 5.",
        Hindi: "अमान्य चयन। कृपया 1 और 5 के बीच कोई संख्या कहें।",
        Marathi: "अवैध निवड. कृपया 1 ते 5 मधील संख्या सांगा.",
        Tamil: "தவறான தேர்வு. 1 முதல் 5 வரை உள்ள எண்ணைக் கூறுங்கள்.",
        Telugu: "చెల్లని ఎంపిక. దయచేసి 1 మరియు 5 మధ్య ఒక సంఖ్యను చెప్పండి.",
        Bengali: "অবৈধ নির্বাচন। অনুগ্রহ করে 1 থেকে 5 এর মধ্যে একটি সংখ্যা বলুন।"
    },
    lang_invalid_2: {
        English: "I didn't catch that. Please say the number or the language name.",
        Hindi: "मुझे समझ नहीं आया। कृपया संख्या या भाषा का नाम कहें।",
        Marathi: "मला समजले नाही. कृपया संख्या किंवा भाषेचे नाव सांगा.",
        Tamil: "எனக்கு புரியவில்லை. தயவுசெய்து எண் அல்லது மொழியின் பெயரைக் கூறவும்.",
        Telugu: "నాకు అర్థం కాలేదు. దయచేసి సంఖ్య లేదా భాష పేరు చెప్పండి.",
        Bengali: "আমি বুঝতে পারিনি। অনুগ্রহ করে সংখ্যা বা ভাষার নাম বলুন।"
    },
    lang_invalid_3: {
        English: "Too many invalid attempts. Returning to home.",
        Hindi: "बहुत सारे अमान्य प्रयास। होम पर लौट रहे हैं।",
        Marathi: "खूप जास्त अवैध प्रयत्न. होमवर परत येत आहे.",
        Tamil: "மிகவும் அதிகமான தவறான முயற்சிகள். முகப்பிற்குத் திரும்புகிறது.",
        Telugu: "చాలా చెల్లని ప్రయత్నాలు. హోమ్‌కి తిరిగి వస్తోంది.",
        Bengali: "অনেক বেশি অবৈধ প্রচেষ্টা। হোমে ফিরে যাচ্ছে।"
    },
    lang_repeat: {
        English: "Please repeat your choice.",
        Hindi: "कृपया अपनी पसंद दोहराएं।",
        Marathi: "कृपया तुमची निवड पुन्हा सांगा.",
        Tamil: "உங்கள் தேர்வை மீண்டும் கூறவும்.",
        Telugu: "దయచేసి మీ ఎంపికను పునరావృతం చేయండి.",
        Bengali: "অনুগ্রহ করে আপনার পছন্দটি পুনরাবৃত্তি করুন।"
    },
    desc_start: {
        English: "Analyzing surroundings.",
        Hindi: "परिवेश का विश्लेषण कर रहे हैं।",
        Marathi: "सभोवतालचे विश्लेषण करत आहे.",
        Tamil: "சுற்றுப்புறங்களை பகுப்பாய்வு செய்கிறது.",
        Telugu: "పరిసరాలను విశ్లేషిస్తోంది.",
        Bengali: "পারিপার্শ্বিক বিশ্লেষণ করা হচ্ছে।"
    },
    currency_start: {
        English: "Show currency in front of camera.",
        Hindi: "कैमरे के सामने मुद्रा दिखाएं।",
        Marathi: "कॅमेरासमोर चलन दाखवा.",
        Tamil: "கேமராவின் முன் நாணயத்தைக் காட்டவும்.",
        Telugu: "కెమెరా ముందు కరెన్సీని చూపించు.",
        Bengali: "ক্যামেরার সামনে মুদ্রা দেখান।"
    },
    service_unavail: {
        English: "Service unavailable.",
        Hindi: "सेवा अनुपलब्ध है।",
        Marathi: "सेवा अनुपलब्ध.",
        Tamil: "சேவை கிடைக்கவில்லை.",
        Telugu: "సేవ అందుబాటులో లేదు.",
        Bengali: "পরিষেবা অনুপলব্ধ।"
    },
    camera_unavail: {
        English: "Camera unavailable.",
        Hindi: "कैमरा अनुपलब्ध है।",
        Marathi: "कॅमेरा अनुपलब्ध.",
        Tamil: "கேமரா கிடைக்கவில்லை.",
        Telugu: "కెమెరా అందుబాటులో లేదు.",
        Bengali: "ক্যামেরা অনুপলব্ধ।"
    },
    btn_navigate: {
        English: "Navigate",
        Hindi: "नेविगेट",
        Marathi: "नेव्हिगेट",
        Tamil: "வழிசெலுத்து",
        Telugu: "నావిగేట్ చేయండి",
        Bengali: "নেভিগেট"
    },
    btn_find: {
        English: "Find Object",
        Hindi: "वस्तु खोजें",
        Marathi: "वस्तू शोधा",
        Tamil: "பொருளைக் கண்டுபிடி",
        Telugu: "వస్తువును కనుగొనండి",
        Bengali: "বস্তু খুঁজুন"
    },
    btn_describe: {
        English: "Describe Scene",
        Hindi: "दृश्य का वर्णन करें",
        Marathi: "दृश्याचे वर्णन करा",
        Tamil: "காட்சியை விவரி",
        Telugu: "సన్నివేశాన్ని వివరించండి",
        Bengali: "দৃশ্য বর্ণনা করুন"
    },
    btn_currency: {
        English: "Currency",
        Hindi: "मुद्रा",
        Marathi: "चलन",
        Tamil: "நாணயம்",
        Telugu: "కరెన్సీ",
        Bengali: "মুদ্রা"
    },
    btn_language: {
        English: "Language",
        Hindi: "भाषा",
        Marathi: "भाषा",
        Tamil: "மொழி",
        Telugu: "భాష",
        Bengali: "ভাষা"
    },
    btn_permissions: {
        English: "Permissions",
        Hindi: "अनुमतियां",
        Marathi: "परवानग्या",
        Tamil: "அனுமதிகள்",
        Telugu: "అనుమతులు",
        Bengali: "অনুমতি"
    },
    btn_emergency: {
        English: "Emergency Info",
        Hindi: "आपातकालीन जानकारी",
        Marathi: "आणीबाणीची माहिती",
        Tamil: "அவசரகால தகவல்",
        Telugu: "అత్యవసర సమాచారం",
        Bengali: "জরুরী তথ্য"
    },
    btn_analyze_again: {
        English: "Analyze Again",
        Hindi: "फिर से विश्लेषण करें",
        Marathi: "पुन्हा विश्लेषण करा",
        Tamil: "மீண்டும் பகுப்பாய்வு செய்",
        Telugu: "మళ్లీ విశ్లేషించండి",
        Bengali: "আবার বিশ্লেষণ করুন"
    },
    status_ready: {
        English: "Ready",
        Hindi: "तैयार",
        Marathi: "तयार",
        Tamil: "தயார்",
        Telugu: "సిద్ధం",
        Bengali: "প্রস্তুত"
    },
    status_listening_lang: {
        English: "Listening for language selection...",
        Hindi: "भाषा चयन के लिए सुन रहे हैं...",
        Marathi: "भाषा निवडीसाठी ऐकत आहे...",
        Tamil: "மொழித் தேர்வைக் கேட்கிறது...",
        Telugu: "భాష ఎంపిక కోసం వింటోంది...",
        Bengali: "ভাষা নির্বাচনের জন্য শুনছে..."
    }
};

export function t(key: string, currentLanguage: string): string {
    const lang = currentLanguage as LanguageCode;
    if (!translations[key]) return key;
    return translations[key][lang] || translations[key]['English'] || key;
}
