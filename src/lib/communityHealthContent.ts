import type { CommunityHealthCard, TribalLanguageCode } from '../types/hvisa.ts';

export const TRIBAL_LANGUAGES: Array<{
  code: TribalLanguageCode;
  label: string;
  nativeLabel: string;
  speechLocale: string;
}> = [
  { code: 'en', label: 'English', nativeLabel: 'English', speechLocale: 'en-IN' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', speechLocale: 'mr-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechLocale: 'hi-IN' },
];

export const COMMUNITY_HEALTH_CARDS: CommunityHealthCard[] = [
  {
    id: 'card-antibiotic-course',
    topicKey: 'antibiotic_completion',
    iconType: 'shield',
    translations: {
      en: {
        title: 'Finish Your Full Medicine Course',
        summary:
          'Stopping prescribed medicines early lets tough bacteria survive and become harder to treat in the village.',
        actionSteps: [
          'Take every dose for the full days advised by the PHC doctor or health worker.',
          'Never share leftover antibiotics with family or neighbors without a checkup.',
          'Return to the ASHA worker or mobile clinic if fever or wound swelling returns.',
        ],
        spokenScript:
          'Finish your full medicine course. Stopping medicines early allows strong germs to survive. Always complete all prescribed days and never share leftover tablets without a health check.',
      },
      hi: {
        title: 'दवा का पूरा कोर्स समय पर खत्म करें',
        summary:
          'दवा बीच में छोड़ने से मजबूत जीवाणु बच जाते हैं और आगे इलाज कठिन हो जाता है।',
        actionSteps: [
          'पीएचसी डॉक्टर या स्वास्थ्य कार्यकर्ता द्वारा बताए गए पूरे दिनों तक दवा लें।',
          'बची हुई एंटीबायोटिक दवा बिना जांच के किसी और को न दें।',
          'बुखार या घाव में सूजन वापस आने पर तुरंत आशा दीदी या मोबाइल क्लिनिक से मिलें।',
        ],
        spokenScript:
          'दवा का पूरा कोर्स समय पर खत्म करें। दवा बीच में छोड़ने से जीवाणु मजबूत हो जाते हैं। बिना जांच के किसी और को बची हुई दवा न दें।',
      },
      mr: {
        title: 'औषधांचा पूर्ण कोर्स वेळेवर पूर्ण करा',
        summary:
          'औषधे अर्धवट सोडल्यास जंतू अधिक चिवट होतात आणि नंतर बरे होण्यास जास्त वेळ लागतो.',
        actionSteps: [
          'प्राथमिक आरोग्य केंद्रातील डॉक्टर किंवा आरोग्य सेवकांनी सांगितलेले सर्व दिवस औषध घ्या.',
          'उरलेली औषधे तपासणीशिवाय इतर कोणालाही देऊ नका.',
          'ताप किंवा जखमेची सूज परत आल्यास तात्काळ आशा ताई किंवा फिरत्या दवाखान्याशी संपर्क साधा.',
        ],
        spokenScript:
          'औषधांचा पूर्ण कोर्स वेळेवर पूर्ण करा. औषधे अर्धवट सोडू नका. उरलेली औषधे इतर कोणालाही देऊ नका.',
      },
    },
  },
  {
    id: 'card-wound-hygiene',
    topicKey: 'wound_hygiene',
    iconType: 'droplets',
    translations: {
      en: {
        title: 'Clean Water & Safe Wound Care',
        summary:
          'Keeping skin cuts clean and dry stops common bacteria from spreading in shared households.',
        actionSteps: [
          'Wash hands with soap and clean running water before touching any bandage.',
          'Cover open sores with a clean cloth or sterile dressing provided by the health worker.',
          'Avoid applying mud, ash, or unboiled leaf pastes on open skin wounds.',
        ],
        spokenScript:
          'Keep cuts and wounds clean and dry. Wash hands with soap and clean water before touching bandages, and avoid putting mud or ash on open skin.',
      },
      hi: {
        title: 'साफ पानी और सुरक्षित घाव देखभाल',
        summary:
          'घाव को साफ और सूखा रखने से घर के अन्य लोगों में संक्रमण फैलने से रुकता है।',
        actionSteps: [
          'पट्टी छूने से पहले साबुन और साफ बहते पानी से हाथ धोएं।',
          'खुले घाव को साफ कपड़े या स्वास्थ्य केंद्र की पट्टी से ढककर रखें।',
          'खुले घाव पर मिट्टी, राख या बिना उबली पत्ती का लेप न लगाएं।',
        ],
        spokenScript:
          'घाव को साफ और सूखा रखें। पट्टी छूने से पहले साबुन से हाथ धोएं और खुले घाव पर मिट्टी या राख न लगाएं।',
      },
      mr: {
        title: 'स्वच्छ पाणी आणि जखमेची सुरक्षित काळजी',
        summary:
          'जखम स्वच्छ आणि कोरडी ठेवल्यास घरातील इतर सदस्यांना संसर्ग पसरत नाही.',
        actionSteps: [
          'पट्टीला हात लावण्यापूर्वी साबण आणि स्वच्छ पाण्याने हात धुवा.',
          'उघडी जखम स्वच्छ कापड किंवा आरोग्य सेवकांनी दिलेल्या पट्टीने झाकून ठेवा.',
          'उघड्या जखमेवर माती, राख किंवा कच्चा पाला लावणे टाळा.',
        ],
        spokenScript:
          'जखम स्वच्छ आणि कोरडी ठेवा. पट्टी बदलण्यापूर्वी साबणाने हात धुवा आणि जखमेवर माती किंवा राख लावू नका.',
      },
    },
  },
  {
    id: 'card-sample-journey',
    topicKey: 'sample_journey',
    iconType: 'truck',
    translations: {
      en: {
        title: 'How Village Sample Testing Works (Cold-Chain)',
        summary:
          'Samples travel from your village PHC to the district microbiology lab in a cooled carrier with an anonymous code, never your personal name.',
        actionSteps: [
          'The health worker labels the tube with an anonymous Sample Code (no personal identity stored).',
          'Keep the sample box cool (2–8 °C) and deliver it within 24 hours for reliable lab results.',
          'Once the district microbiologist reviews the QA check, the status returns to your PHC worker.',
        ],
        spokenScript:
          'Your sample travels with an anonymous code, not your name. Keeping the ice box cool and delivering within 24 hours ensures accurate laboratory quality assurance.',
      },
      hi: {
        title: 'गांव से जांच केंद्र तक सैंपल की सुरक्षित यात्रा',
        summary:
          'सैंपल बिना किसी व्यक्तिगत नाम के केवल गुप्त कोड के साथ ठंडे बॉक्स में जिला लैब भेजा जाता है।',
        actionSteps: [
          'स्वास्थ्य कार्यकर्ता ट्यूब पर केवल सैंपल कोड लिखते हैं (व्यक्तिगत नाम नहीं)।',
          'सही जांच के लिए आइस-बॉक्स को ठंडा (2–8 °C) रखें और 24 घंटे के भीतर लैब पहुंचाएं।',
          'लैब समीक्षा पूरी होने पर रिपोर्ट की स्थिति आपके पीएचसी कार्यकर्ता को वापस मिल जाती है।',
        ],
        spokenScript:
          'सैंपल बिना नाम के गुप्त कोड के साथ ठंडे बॉक्स में जिला लैब जाता है और 24 घंटे के अंदर जांच के लिए पहुंचना जरूरी है।',
      },
      mr: {
        title: 'गावातून प्रयोगशाळेपर्यंत नमुन्याचा सुरक्षित प्रवास',
        summary:
          'नमुने वैयक्तिक नावाशिवाय केवळ सांकेतिक कोडसह थंड पेटीतून जिल्हा प्रयोगशाळेत पाठवले जातात.',
        actionSteps: [
          'आरोग्य सेवक नमुन्यावर फक्त सांकेतिक कोड नोंदवतात (कोणतीही वैयक्तिक ओळख नाही).',
          'अचूक तपासणीसाठी आइस-बॉक्स थंड (2–8 °C) ठेवून 24 तासांच्या आत प्रयोगशाळेत पोहोचवा.',
          'प्रयोगशाळेची गुणवत्ता तपासणी पूर्ण झाल्यावर स्थिती तुमच्या आरोग्य केंद्राकडे परत येते.',
        ],
        spokenScript:
          'नमुन्यावर तुमचे नाव नसते तर फक्त सांकेतिक कोड असतो. २४ तासांत थंड पेटीतून नमुना प्रयोगशाळेत पोहोचवला जातो.',
      },
    },
  },
];
