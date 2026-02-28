# EchoSight - Project Report

## 1. Project Overview
**EchoSight** is an AI-powered, voice-first accessibility application meticulously designed to empower visually impaired individuals. It serves as an intelligent companion that helps users navigate their environment, understand physical surroundings, and stay securely connected with their loved ones. By combining state-of-the-art Generative AI Vision with regional language nuances, EchoSight provides an inclusive, real-time auditory interface.

## 2. Problem Statement & Mission
**Mission:** To empower independence and safety for visually impaired users using intelligent, accessible technology.

Millions of visually impaired individuals face daily challenges in navigating new environments, identifying objects/currency, and communicating their real-time safety status to guardians. Existing solutions are often limited to English, lack context-aware AI vision, or involve complex physical hardware. EchoSight solves this by turning any standard smartphone into a highly capable, localized, and context-aware auditory assistant.

## 3. Core Features & Scope

### 👁️ Scene & Object Intelligence
- **Describe Scene:** Uses the device's camera to capture the environment and passes it to an AI Vision model to audibly describe layout, lighting, and obstacles.
- **Find Object:** Allows the user to specify an object via voice. The AI continuously evaluates the camera feed to guide the user toward the object.
- **Currency Identification:** Scans and identifies the denomination of currency held in front of the camera, preventing fraud.

### 🗺️ Smart Navigation & Tracking
- **Live AI Navigation:** By prompting a destination, the AI analyzes the live camera feed and provides step-by-step auditory guidance around immediate physical obstacles.
- **Guardian Tracking:** A dedicated `Notify` ecosystem that leverages GPS positioning. Users can lock their destination, and the app will generate a geofenced tracking map.

### 🔔 Family Safety & Notifications
- **WhatsApp Integration:** Leveraging Twilio's Sandbox, the app maintains a list of trusted Guardian phone numbers. As the user moves, live journey updates are broadcasted to these guardians via WhatsApp.
- **Family Pairing QR:** A clean UI allowing guardians to quickly scan a QR code on the user's screen to opt-in to the Twilio sandbox alerts.
- **Emergency SOS:** A dedicated, globally accessible panic button that immediately provides critical medical details (Blood type, age), sounds an alarm, and dials a primary emergency contact.

### 🌐 High-Fidelity Localization & Accessibility
- **Extensive Regional Support:** Supports over 14 languages, including English, Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Assamese, Manipuri, and Bodo.
- **Voice-Bypass Interface:** Users do not need to read the screen. They can tap the screen and speak their intent, or follow the auditory prompts.
- **Accessible UI Design:** Specifically engineered with a high-contrast, deep-blue theme (`#0A192F` to `#E3F2FD`), 16px rounded borders, smooth Framer Motion transitions, and fully legible typography (Poppins).

## 4. Technology Stack

### Frontend Architecture
- **Framework:** React 18, utilizing functional components and hooks (`useState`, `useEffect`, custom `useSpeech`, `useCamera`).
- **Build Tool:** Vite for lightning-fast HMR and optimized production bundles.
- **Styling:** Tailwind CSS (configured for a strict custom accessible Blue Palette) and CSS Modules.
- **Typography & Icons:** Google Fonts (Poppins) and Lucide-React for clean, scalable, accessible iconography.
- **Animations:** Framer Motion (`motion/react`) for smooth, non-jarring page transitions.

### AI & Cloud Services
- **Vision & Intelligence:** `Google Gemini API` (`@google/genai`) to process base64 camera frames and return localized, contextual analysis.
- **Voice Synthesis:** `Sarvam AI TTS API` for hyper-realistic, native-sounding Indian language pronunciation, falling back to the native browser Web Speech API when necessary.
- **Speech Recognition:** Native browser `SpeechRecognition` API.

### Communication & Mapping
- **Messaging:** `Twilio API` configured for secure, automated WhatsApp notifications.
- **Maps & Geofencing:** `React Leaflet` and OpenStreetMap (`TileLayer`) for rendering live location maps on the Notify dashboard. Nominatim API for geocoding search queries.
- **QR Generation:** `qrcode.react` for rendering dynamic Twilio sandbox pairing codes.

## 5. Security & Privacy
- **Client-Side Storage:** Avoids heavy database reliance to protect user privacy. All Guardian numbers, Emergency Medical Info, and Settings are cached securely in the browser's `localStorage`.
- **Granular Permissions Validation:** Features a live-polling Permissions Dashboard utilizing the OS `navigator.permissions` API, allowing users to forcefully verify or request Camera, Microphone, and Geolocation access to prevent unauthorized tracking.
- **Rate Limit Protection:** Incorporates error interception algorithms to detect API quota limits (HTTP 429), gracefully warning the user in their native language instead of infinitely looping.

## 6. Future Roadmap
- **Offline Fallback Models:** Implementing lightweight, on-device Object Detection models to provide basic navigation when internet connectivity drops.
- **Wearable Integration:** Bridging the app to smartwatches for haptic feedback (vibrations for turning left/right).
- **Public Transit APIs:** Integrating live bus and train ETAs directly into the Navigation context.
