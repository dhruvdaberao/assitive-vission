const fs = require('fs');

const txt = fs.readFileSync('src/translations.ts', 'utf-8');

const newKeys = {
    btn_about: { English: "About Us", Hindi: "हमारे बारे बारे में", Urdu: "ہمارے بارے میں" },
    btn_how_to_use: { English: "How To Use", Hindi: "कैसे उपयोग करें", Urdu: "استعمال کا طریقہ" },
    page_about_title: { English: "About EchoSight", Hindi: "इकोसाइट के बारे में", Urdu: "ایکو سائٹ کے بارے میں" },
    page_about_overview: { English: "Overview", Hindi: "अवलोकन", Urdu: "جائزہ" },
    page_about_overview_text: { English: "EchoSight is an AI-powered accessibility application designed to assist visually impaired individuals in navigating and understanding their surroundings.", Hindi: "इकोसाइट एक एआई-संचालित एप्लिकेशन है जो दृष्टिबाधित व्यक्तियों को नेविगेट करने और उनके परिवेश को समझने में सहायता करता है।", Urdu: "ایکو سائٹ ایک اے آئی سے چلنے والی ایپلی کیشن ہے جو نابینا افراد کو نیویگیٹ کرنے اور ان کے ارد گرد کو سمجھنے میں مدد کرتی ہے۔" },
    page_about_features: { English: "Features", Hindi: "विशेषताएं", Urdu: "خصوصیات" },
    page_about_feature_1: { English: "Scene Description using AI", Hindi: "एआई का उपयोग करके दृश्य विवरण", Urdu: "اے آئی کا استعمال کرتے ہوئے منظر کی تفصیل" },
    page_about_feature_2: { English: "Currency Detection", Hindi: "मुद्रा पहचान", Urdu: "کرنسی کی شناخت" },
    page_about_feature_3: { English: "Smart Navigation", Hindi: "स्मार्ट नेविगेशन", Urdu: "سمارٹ نیویگیشن" },
    page_about_feature_4: { English: "Family Safety Notifications", Hindi: "पारिवारिक सुरक्षा सूचनाएं", Urdu: "خاندانی حفاظت کی اطلاعات" },
    page_about_feature_5: { English: "WhatsApp Alert System", Hindi: "व्हाट्सएप अलर्ट सिस्टम", Urdu: "واٹس ایپ الرٹ سسٹم" },
    page_about_feature_6: { English: "Real-time Location Tracking", Hindi: "रीयल-टाइम लोकेशन ट्रैकिंग", Urdu: "ریئل ٹائم لوکیشن ٹریکنگ" },
    page_about_mission: { English: "Mission", Hindi: "मिशन", Urdu: "مشن" },
    page_about_mission_text: { English: '"To empower independence and safety for visually impaired users using intelligent technology."', Hindi: '"बुद्धिमान प्रौद्योगिकी का उपयोग करके दृष्टिबाधित उपयोगकर्ताओं के लिए स्वतंत्रता और सुरक्षा को सशक्त बनाना।""', Urdu: '"ذہین ٹیکنالوجی کا استعمال کرتے ہوئے نابینا صارفین کے لیے آزادی اور حفاظت کو بااختیار بنانا۔"' },
    page_htu_title: { English: "How To Use", Hindi: "कैसे उपयोग करें", Urdu: "استعمال کا طریقہ" },
    page_htu_scene: { English: "Scene Description", Hindi: "दृश्य विवरण", Urdu: "منظر کی تفصیل" },
    page_htu_scene_text: { English: "Tap the \\\"Describe Area\\\" button. Point your camera forward, and the AI will analyze objects, lighting, and layout, returning detailed voice feedback of your surroundings.", Hindi: "\\\"Describe Area\\\" बटन पर टैप करें। अपने कैमरे को आगे की ओर इंगित करें, और एआई वस्तुओं, प्रकाश व्यवस्था और लेआउट का विश्लेषण करेगा, आपके परिवेश का विस्तृत वॉयस फीडबैक लौटाएगा।", Urdu: "\\\"Describe Area\\\" بٹن پر ٹیپ کریں۔ اپنے کیمرے کو آگے کی طرف اشارہ کریں، اور اے آئی اشیاء، روشنی اور لے آؤٹ کا تجزیہ کرے گا، آپ کے ارد گرد کی تفصیلی آواز کی رائے واپس کرے گا۔" },
    page_htu_nav: { English: "Navigation", Hindi: "नेविगेशन", Urdu: "نیویگیشن" },
    page_htu_nav_text: { English: "Tap \\\"Navigate\\\". Speak your desired destination. The intelligent AI will scan your current visual field and guide your steps around obstacles toward your goal in real-time.", Hindi: "\\\"Navigate\\\" टैप करें। अपना वांछित गंतव्य बोलें। बुद्धिमान एआई आपके वर्तमान दृश्य क्षेत्र को स्कैन करेगा और वास्तविक समय में आपके लक्ष्य की ओर बाधाओं के आसपास आपके कदमों का मार्गदर्शन करेगा।", Urdu: "\\\"Navigate\\\" ٹیپ کریں۔ اپنی مطلوبہ منزل بولیں۔ ذہین اے آئی آپ کے موجودہ بصری میدان کو اسکین کرے گا اور حقیقی وقت میں آپ کے ہدف کی طرف رکاوٹوں کے ارد گرد آپ کے قدموں کی رہنمائی کرے گا۔" },
    page_htu_notify: { English: "Notify Feature", Hindi: "अधिसूचित सुविधा", Urdu: "مطلع کرنے کی خصوصیت" },
    page_htu_notify_text_1: { English: "1. Add trusted WhatsApp numbers.", Hindi: "1. विश्वसनीय व्हाट्सएप नंबर जोड़ें।", Urdu: "1. قابل اعتماد واٹس ایپ نمبر شامل کریں۔" },
    page_htu_notify_text_2: { English: "2. Search for your remote destination on the map and tap \\\"Save\\\" to lock tracking.", Hindi: "2. मानचित्र पर अपने दूरस्थ गंतव्य की खोज करें और ट्रैकिंग लॉक करने के लिए \\\"Save\\\" टैप करें।", Urdu: "2. نقشے پر اپنی دور دراز منزل تلاش کریں اور ٹریکنگ کو لاک کرنے کے لیے \\\"Save\\\" ٹیپ کریں۔" },
    page_htu_notify_text_3: { English: "3. The system will automatically live-update your loved ones as you move.", Hindi: "3. जैसे ही आप आगे बढ़ेंगे, सिस्टम स्वचालित रूप से आपके प्रियजनों को लाइव-अपडेट करेगा।", Urdu: "3. جیسے ہی آپ آگے بڑھیں گے، سسٹم خود بخود آپ کے پیاروں کو لائیو اپ ڈیٹ کرے گا۔" },
    page_htu_sos: { English: "SOS", Hindi: "एसओएस", Urdu: "ایس او ایس" },
    page_htu_sos_text: { English: "In case of danger, Double-Tap the Emergency button. Your device will immediately flash an alert, dial your primary emergency contact line, and sound an alarm.", Hindi: "खतरे के मामले में, इमरजेंसी बटन पर डबल-टैप करें। आपका उपकरण तुरंत एक अलर्ट फ्लैश करेगा, आपकी प्राथमिक आपातकालीन संपर्क लाइन डायल करेगा, और अलार्म बजाएगा।", Urdu: "خطرے کی صورت میں، ایمرجنسی بٹن پر ڈبل ٹیپ کریں۔ آپ کا آلہ فوراً الرٹ فلیش کرے گا، آپ کی بنیادی ہنگامی رابطہ لائن ڈائل کرے گا، اور الارم بجائے گا۔" },
    page_perm_title: { English: "Permissions", Hindi: "अनुमतियां", Urdu: "اجازتیں" },
    page_perm_desc: { English: "Manage application permissions required for core features.", Hindi: "मुख्य सुविधाओं के लिए आवश्यक एप्लिकेशन अनुमतियां प्रबंधित करें।", Urdu: "بنیادی خصوصیات کے لیے درکار ایپلیکیشن کی اجازتوں کا نظم کریں۔" },
    page_perm_camera: { English: "Camera", Hindi: "कैमरा", Urdu: "کیمرہ" },
    page_perm_mic: { English: "Microphone", Hindi: "माइक्रोफ़ोन", Urdu: "مائیکروفون" },
    page_perm_location: { English: "Location", Hindi: "स्थान", Urdu: "مقام" },
    page_perm_granted: { English: "Granted", Hindi: "प्रदान की गई", Urdu: "عطا کی گئی" },
    page_perm_request: { English: "Request / Off", Hindi: "अनुरोध / बंद", Urdu: "درخواست / بند" },
    page_perm_footer: { English: "Permissions can be fully managed in your device's system settings.", Hindi: "अनुमतियों को आपके डिवाइस की सिस्टम सेटिंग्स में पूरी तरह से प्रबंधित किया जा सकता है।", Urdu: "اجازتوں کا مکمل طور پر آپ کے آلے کی سسٹم کی ترتیبات میں نظم کیا جا سکتا ہے۔" },
    emergency_medical_title: { English: "Medical Details", Hindi: "चिकित्सा विवरण", Urdu: "طبی تفصیلات" },
    emergency_contact_title: { English: "Emergency Contact", Hindi: "आपातकालीन संपर्क", Urdu: "ہنگامی رابطہ" },
    emergency_name_label: { English: "Full Name", Hindi: "पूरा नाम", Urdu: "پورا نام" },
    emergency_age_label: { English: "Age", Hindi: "उम्र", Urdu: "عمر" },
    emergency_blood_label: { English: "Blood Type", Hindi: "रक्त समूह", Urdu: "بلڈ گروپ" },
    emergency_cname_label: { English: "Contact Name", Hindi: "संपर्क नाम", Urdu: "رابطہ کا نام" },
    emergency_cphone_label: { English: "Phone Number", Hindi: "फ़ोन नंबर", Urdu: "فون نمبر" },
    emergency_call_btn: { English: "Call", Hindi: "कॉल करें", Urdu: "کال کریں" },
    notify_header: { English: "Notify Dashboard", Hindi: "अधिसूचित डैशबोर्ड", Urdu: "مطلع کرنے کا ڈیش بورڈ" },
    notify_sub: { English: "Configure SOS and Geofence alerts for your trusted contacts.", Hindi: "अपने विश्वसनीय संपर्कों के लिए SOS और जियोफेंस अलर्ट कॉन्फ़िगर करें।", Urdu: "اپنے قابل اعتماد رابطوں کے لیے SOS اور جیو فینس الرٹس کنفیگر کریں۔" },
    notify_details_title: { English: "Your Details", Hindi: "आपके विवरण", Urdu: "آپ کی تفصیلات" },
    notify_name_label: { English: "Your Name", Hindi: "आपका नाम", Urdu: "آپ کا نام" },
    notify_contacts_title: { English: "Emergency Contacts", Hindi: "आपातकालीन संपर्क", Urdu: "ہنگامی رابطے" },
    notify_add_btn: { English: "Add", Hindi: "जोड़ें", Urdu: "شامل کریں" },
    notify_dest_title: { English: "Journey Destination", Hindi: "यात्रा गंतव्य", Urdu: "سفر کی منزل" },
    notify_dest_label: { English: "Search Location", Hindi: "स्थान खोजें", Urdu: "مقام تلاش کریں" },
    notify_btn_search: { English: "Search", Hindi: "खोजें", Urdu: "تلاش کریں" },
    notify_btn_save: { English: "Save", Hindi: "सहेजें", Urdu: "محفوظ کریں" },
    notify_btn_edit: { English: "Edit Location", Hindi: "स्थान संपादित करें", Urdu: "مقام میں ترمیم کریں" },
    notify_tracking_active: { English: "Tracking Active", Hindi: "ट्रैकिंग सक्रिय", Urdu: "ٹریکنگ فعال" },
    notify_remote_title: { English: "Remote Guardian", Hindi: "रिमोट गार्जियन", Urdu: "ریموٹ گارڈین" },
    notify_remote_sub: { English: "Connect guardian to live location dashboard", Hindi: "अभिभावक को लाइव लोकेशन डैशबोर्ड से कनेक्ट करें", Urdu: "گارڈین کو لائیو لوکیشن ڈیش بورڈ سے مربوط کریں" },
    notify_remote_sub2: { English: "Share tracking QR externally.", Hindi: "बाहरी रूप से ट्रैकिंग क्यूआर साझा करें।", Urdu: "بیرونی طور پر ٹریکنگ کیو آر شیئر کریں۔" }
};

let modifiedTxt = txt;

// Add Urdu to LanguageCode
if (!modifiedTxt.includes("| 'Urdu'")) {
    modifiedTxt = modifiedTxt.replace(/export type LanguageCode =([^;]+);/, (match, p1) => {
        return `export type LanguageCode =${p1} | 'Urdu';`;
    });
}

// Add new UI keys before closing brace
const endingBraceIndex = modifiedTxt.lastIndexOf('};');
if (endingBraceIndex > -1) {
    let before = modifiedTxt.substring(0, endingBraceIndex).trim();
    if (!before.endsWith(',')) before += ',';

    let injectedKeys = '';
    for (const [key, langs] of Object.entries(newKeys)) {
        injectedKeys += `\n    ${key}: {\n`;
        for (const [lang, val] of Object.entries(langs)) {
            injectedKeys += `        ${lang}: "${val}",\n`;
        }
        // Remove trailing comma
        injectedKeys = injectedKeys.slice(0, -2);
        injectedKeys += `\n    },`;
    }

    // Remove last comma
    injectedKeys = injectedKeys.slice(0, -1);

    modifiedTxt = before + injectedKeys + '\n};\n' + modifiedTxt.substring(endingBraceIndex + 2);
}

fs.writeFileSync('src/translations.ts', modifiedTxt, 'utf-8');
console.log('Script completed successfully.');
