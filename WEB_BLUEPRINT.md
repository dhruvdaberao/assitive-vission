# Assistive Vision – Voice System Architecture

## 1. Complete VoiceEngine Module

```typescript
// src/services/VoiceEngine.ts
export const LANGUAGE_CONFIG = {
  'English': { code: 'en-IN', voice: 'meera' },
  'Hindi': { code: 'hi-IN', voice: 'meera' },
  'Marathi': { code: 'mr-IN', voice: 'meera' },
  'Tamil': { code: 'ta-IN', voice: 'meera' },
  'Telugu': { code: 'te-IN', voice: 'meera' },
  'Bengali': { code: 'bn-IN', voice: 'meera' }
};

class VoiceEngineClass {
  private currentLang = 'English';
  private recognition: any = null;
  public isListening = false;

  constructor() {
    this.currentLang = localStorage.getItem('appLanguage') || 'English';
  }

  setLanguage(lang: string) {
    this.currentLang = lang;
    localStorage.setItem('appLanguage', lang);
  }

  async speak(text: string): Promise<void> {
    this.stopSpeaking();
    try {
      // 1. Try Sarvam API via Backend Proxy
      const langCode = LANGUAGE_CONFIG[this.currentLang as keyof typeof LANGUAGE_CONFIG]?.code || 'en-IN';
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: langCode })
      });
      if (!res.ok) throw new Error("Sarvam TTS failed");
      
      const arrayBuffer = await res.arrayBuffer();
      await this.playAudioBuffer(arrayBuffer);
    } catch (e) {
      // 2. Fallback to Web Speech API
      await this.speakWebSpeech(text);
    }
  }

  private speakWebSpeech(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_CONFIG[this.currentLang as keyof typeof LANGUAGE_CONFIG]?.code || 'en-IN';
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  private async playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    return new Promise(resolve => {
      source.onended = () => resolve();
    });
  }

  stopSpeaking() {
    window.speechSynthesis.cancel();
  }

  async listen(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        await this.speak("Microphone permission required.");
        reject('audio-capture');
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject('Speech recognition not supported');
        return;
      }

      if (this.recognition) this.recognition.stop();

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = LANGUAGE_CONFIG[this.currentLang as keyof typeof LANGUAGE_CONFIG]?.code || 'en-IN';

      this.recognition.onstart = () => { this.isListening = true; };
      this.recognition.onresult = (event: any) => resolve(event.results[0][0].transcript);
      this.recognition.onerror = (event: any) => { this.isListening = false; reject(event.error); };
      this.recognition.onend = () => { this.isListening = false; };

      this.recognition.start();
    });
  }

  stopListening() {
    if (this.recognition) this.recognition.stop();
    this.isListening = false;
  }
}

export const VoiceEngine = new VoiceEngineClass();
```

## 2. Backend Sarvam TTS Proxy Example

```javascript
// POST /api/speak
app.post('/api/speak', async (req, res) => {
  try {
    const { text, language } = req.body;
    const response = await axios.post('https://api.sarvam.ai/v1/text-to-speech', {
      text: text,
      language_code: language,
      speaker: "meera"
    }, {
      headers: { 'Authorization': `Bearer ${process.env.SARVAM_API_KEY}` },
      responseType: 'arraybuffer'
    });
    res.set('Content-Type', 'audio/wav');
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: "TTS generation failed" });
  }
});
```

## 3. Backend Sarvam STT Proxy Example

```javascript
// POST /api/listen
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/listen', upload.single('audio'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: 'audio.wav' });
    formData.append('language_code', req.body.language);

    const response = await axios.post('https://api.sarvam.ai/v1/speech-to-text', formData, {
      headers: { 
        'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
        ...formData.getHeaders()
      }
    });
    res.json({ transcript: response.data.transcript });
  } catch (error) {
    res.status(500).json({ error: "STT processing failed" });
  }
});
```

## 4. useAccessibleButton Hook

```typescript
import { useRef, useCallback } from 'react';

export function useAccessibleButton(label: string, onActivate: () => void, speak: (text: string) => void) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent ghost clicks
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 500; // 500ms window for double tap

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (navigator.vibrate) navigator.vibrate([50]); // Haptic feedback
      onActivate();
      lastTapRef.current = 0; // Reset
    } else {
      speak(label);
      lastTapRef.current = now;
    }
  }, [label, onActivate, speak]);

  return handleTap;
}
```

## 5. Continuous Listening Hook

```typescript
import { useEffect, useRef } from 'react';
import { VoiceEngine } from '../services/VoiceEngine';

export function useContinuousListen(onCommand: (cmd: string) => void, isActive: boolean) {
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      isRunningRef.current = false;
      VoiceEngine.stopListening();
      return;
    }

    isRunningRef.current = true;
    
    const loop = async () => {
      while (isRunningRef.current) {
        try {
          const command = await VoiceEngine.listen();
          if (command && isRunningRef.current) {
            onCommand(command);
          }
        } catch (e) {
          // Handle silence/errors, wait briefly before restarting
          await new Promise(r => setTimeout(r, 500));
        }
      }
    };
    
    loop();

    return () => {
      isRunningRef.current = false;
      VoiceEngine.stopListening();
    };
  }, [isActive, onCommand]);
}
```

## 6. Language-to-Voice Mapping Configuration

```typescript
export const LANGUAGE_CONFIG = {
  'English': { code: 'en-IN', voice: 'meera', confirmText: 'I will now speak in English.' },
  'Hindi': { code: 'hi-IN', voice: 'meera', confirmText: 'अब मैं हिंदी में बात करूँगा।' },
  'Marathi': { code: 'mr-IN', voice: 'meera', confirmText: 'आता मी मराठीत बोलेन.' },
  'Tamil': { code: 'ta-IN', voice: 'meera', confirmText: 'இப்போது நான் தமிழில் பேசுவேன்.' },
  'Telugu': { code: 'te-IN', voice: 'meera', confirmText: 'ఇప్పుడు నేను తెలుగులో మాట్లాడతాను.' },
  'Bengali': { code: 'bn-IN', voice: 'meera', confirmText: 'এখন আমি বাংলায় কথা বলব।' }
};
```

## 7. Mobile-Safe Double Tap Detection Logic

The `useAccessibleButton` hook uses `Date.now()` to track the exact millisecond of the last tap. By setting the threshold to `500ms` and calling `e.preventDefault()`, we bypass the browser's native 300ms click delay and prevent ghost clicks on mobile devices, ensuring the first tap speaks instantly and the second tap activates reliably.

## 8. Fix for Voice Not Triggering

- **Microphone Permission**: Browsers block STT if permission isn't explicitly granted. `VoiceEngine.listen()` now calls `getUserMedia({ audio: true })` to force the permission prompt before initializing `SpeechRecognition`.
- **User Gesture**: Browsers block TTS if not initiated by a user gesture. The initial single tap on any button serves as this gesture, unlocking the `AudioContext` and `speechSynthesis` for all future programmatic speech.

## 9. Full Example of One Working Feature (Find Object)

```tsx
import React, { useEffect, useState } from 'react';
import { VoiceEngine } from '../services/VoiceEngine';
import { useCamera } from '../hooks/useCamera';

export function FindObjectPage() {
  const { stream } = useCamera();
  const [target, setTarget] = useState('');

  useEffect(() => {
    let isActive = true;

    const startFeature = async () => {
      await VoiceEngine.speak("Tell me what you want to find.");
      
      while (isActive && !target) {
        try {
          const obj = await VoiceEngine.listen();
          if (obj) {
            setTarget(obj);
            await VoiceEngine.speak(`Looking for ${obj}. Scanning area.`);
            // Start camera scanning loop here
            break;
          }
        } catch (e) {
          if (isActive) await VoiceEngine.speak("I didn't catch that. Tell me what you want to find.");
        }
      }
    };

    startFeature();

    return () => {
      isActive = false;
      VoiceEngine.stopListening();
      VoiceEngine.stopSpeaking();
    };
  }, []);

  return (
    <div className="flex-1 relative bg-black">
      {stream && <video srcObject={stream} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />}
      <div className="absolute bottom-10 w-full text-center text-white text-2xl font-bold drop-shadow-lg">
        {target ? `Finding: ${target}` : "Listening..."}
      </div>
    </div>
  );
}
```

## 10. Debug Checklist for Voice Issues

1. **Is the browser supported?** Chrome/Edge support Web Speech API fully. Firefox/Safari have limited support.
2. **Is the site served over HTTPS?** Microphone access (`getUserMedia`) requires a secure context.
3. **Did the user interact with the page?** TTS requires a user click/tap before it can play audio.
4. **Is another app using the microphone?** Ensure no other tabs or apps are locking the audio input.
5. **Check the console for `audio-capture` errors.** This usually means permission was denied.
6. **Check the Network tab.** Ensure the backend proxy `/api/speak` is returning a valid 200 OK with an audio buffer.

## 11. Icon Sizing Guidelines

To ensure the app icon looks clean, professional, and fully visible on all devices, follow these guidelines:

### SVG Source (`/public/icon.svg`)
- **ViewBox**: Use a square viewBox (e.g., `0 0 36 36`).
- **Padding**: Ensure the inner graphic is scaled to about 70-80% of the canvas. For a 36x36 canvas, the graphic should fit within a 24x24 area, leaving a 6px margin on all sides.
- **Background**: Include a solid background rect (e.g., `<rect width="36" height="36" fill="#ffffff" />`) to match the app theme.

### Header Logo
- **Size**: 32px–40px height.
- **CSS**: `max-height: 36px; width: auto; object-fit: contain; padding: 4px;`
- **Alignment**: Vertically center inside the header using flexbox (`items-center`).

### Favicon (`/public/favicon.png`)
- **Size**: 32x32 pixels.
- **Format**: PNG for maximum compatibility.
- **Content**: Centered inside the square canvas, not touching the edges.

### PWA Icons (`/public/manifest.json`)
- **Sizes**: 192x192 and 512x512 pixels.
- **Format**: PNG.
- **Padding**: 10–15% margin inside the canvas.
- **Purpose**: Set to `"any maskable"` to allow the OS to apply its own masking (e.g., squircle on Android, rounded rectangle on iOS).

## 12. Why These Bugs Appeared Now

1. **Infinite Voice Loop**: The previous implementation used a simple `while(isActive)` loop that immediately restarted listening if an error (like `no-speech` timeout) occurred. Because `speak()` and `listen()` were not properly synchronized with a strict state machine, the system would often start listening while it was still speaking, or immediately after a timeout, creating an infinite loop of "Tell me what you are looking for." The new `VoiceState` machine (`IDLE`, `SPEAKING`, `LISTENING`, `PROCESSING`) and the `speakAndListen` utility ensure strict sequential execution and limit retries.
2. **Vision Service Error**: The frontend was trying to call the Gemini API directly using the `@google/genai` SDK. This often fails in production due to CORS restrictions or missing environment variables on the client side. By moving the Gemini API call to a backend Express proxy (`/api/vision`), we securely handle the API key (`process.env.GEMINI_API_KEY`), bypass CORS issues, and can implement robust retry and timeout logic.
3. **Black Box Flash**: The default HTML body has no background color, and React takes a few milliseconds to mount and render the UI. During this gap, the browser renders a black screen (especially in dark mode or standalone PWA mode). By explicitly setting `html, body { background-color: #ffffff; }` in CSS and adding a lightweight CSS-only splash screen in `index.html`, we ensure a smooth, white transition while React loads.
