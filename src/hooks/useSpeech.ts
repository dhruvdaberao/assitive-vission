import React, { useState, useCallback, useRef, useEffect } from 'react';

export const LANGUAGE_CONFIG = {
  'English': { code: 'en-IN', voice: 'meera', confirmText: 'I will now speak in English.' },
  'Hindi': { code: 'hi-IN', voice: 'meera', confirmText: 'आपकी भाषा पसंद सुरक्षित कर दी गई है।' },
  'Marathi': { code: 'mr-IN', voice: 'meera', confirmText: 'तुमची भाषा निवड जतन केली आहे.' },
  'Tamil': { code: 'ta-IN', voice: 'meera', confirmText: 'உங்கள் மொழி விருப்பம் சேமிக்கப்பட்டது.' },
  'Telugu': { code: 'te-IN', voice: 'meera', confirmText: 'మీ భాష ఎంపిక సేవ్ చేయబడింది.' },
  'Bengali': { code: 'bn-IN', voice: 'meera', confirmText: 'আপনার ভাষা পছন্দ সংরক্ষণ করা হয়েছে।' }
};

export function parseSpokenNumber(text: string): number | null {
  const lower = text.toLowerCase().trim();
  if (lower.match(/\b(1|one|ek|एक|first)\b/)) return 1;
  if (lower.match(/\b(2|two|do|दो|second)\b/)) return 2;
  if (lower.match(/\b(3|three|teen|तीन|third)\b/)) return 3;
  if (lower.match(/\b(4|four|char|चार|fourth)\b/)) return 4;
  if (lower.match(/\b(5|five|panch|पांच|fifth)\b/)) return 5;
  if (lower.match(/\b(0|zero|shunya|शून्य|cancel)\b/)) return 0;
  
  const match = lower.match(/\d/);
  if (match) return parseInt(match[0], 10);
  
  return null;
}

export type VoiceState = 'IDLE' | 'SPEAKING' | 'LISTENING' | 'PROCESSING';

export function useSpeech() {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stateRef = useRef<VoiceState>('IDLE');

  const updateState = useCallback((newState: VoiceState) => {
    stateRef.current = newState;
    setVoiceState(newState);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.abort();
      } catch(e) {}
      recognitionRef.current = null;
    }
    if (stateRef.current === 'LISTENING') {
      updateState('IDLE');
    }
  }, [updateState]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    if (stateRef.current === 'SPEAKING') {
      updateState('IDLE');
    }
  }, [updateState]);

  const speak = useCallback(async (text: string): Promise<void> => {
    stopListening();
    updateState('SPEAKING');
    window.speechSynthesis.cancel();
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const currentLang = localStorage.getItem('appLanguage') || 'English';
      utterance.lang = LANGUAGE_CONFIG[currentLang as keyof typeof LANGUAGE_CONFIG]?.code || 'en-IN';
      utterance.rate = 0.9;
      
      utterance.onend = () => {
        if (stateRef.current === 'SPEAKING') updateState('IDLE');
        resolve();
      };
      utterance.onerror = () => {
        if (stateRef.current === 'SPEAKING') updateState('IDLE');
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }, [stopListening, updateState]);

  const listen = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      stopListening();
      updateState('LISTENING');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        updateState('IDLE');
        speak("Microphone permission required.");
        reject('audio-capture');
        return;
      }

      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        updateState('IDLE');
        reject('Speech recognition not supported');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      
      const currentLang = localStorage.getItem('appLanguage') || 'English';
      recognition.lang = LANGUAGE_CONFIG[currentLang as keyof typeof LANGUAGE_CONFIG]?.code || 'en-IN';

      let timeoutId: ReturnType<typeof setTimeout>;

      recognition.onstart = () => {
        if (stateRef.current !== 'LISTENING') {
          recognition.abort();
          return;
        }
        timeoutId = setTimeout(() => {
          if (stateRef.current === 'LISTENING') {
            recognition.abort();
            reject('no-speech');
          }
        }, 5000);
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        clearTimeout(timeoutId);
        if (stateRef.current !== 'LISTENING') return;
        
        const result = event.results[0][0].transcript;
        setTranscript(result);
        updateState('PROCESSING');
        resolve(result);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(timeoutId);
        if (stateRef.current !== 'LISTENING') return;
        updateState('IDLE');
        reject(event.error);
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
        if (stateRef.current === 'LISTENING') {
          updateState('IDLE');
          reject('no-speech');
        }
      };

      try {
        recognition.start();
      } catch (e) {
        updateState('IDLE');
        reject('start-failed');
      }
    });
  }, [speak, stopListening, updateState]);

  const speakAndListen = useCallback(async (text: string, retries = 2): Promise<string> => {
    for (let i = 0; i <= retries; i++) {
      await speak(text);
      try {
        return await listen();
      } catch (e) {
        if (e === 'no-speech' || e === 'network' || e === 'not-allowed') {
          if (i < retries) continue;
        }
        throw e;
      }
    }
    throw new Error('Max retries reached');
  }, [speak, listen]);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return { 
    speak, 
    listen, 
    speakAndListen, 
    stopSpeaking, 
    stopListening, 
    isListening: voiceState === 'LISTENING', 
    isSpeaking: voiceState === 'SPEAKING', 
    voiceState,
    transcript 
  };
}

export function useAccessibleButton(label: string, onActivate: () => void, speak: (text: string) => void) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent ghost clicks on mobile
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 500;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (navigator.vibrate) navigator.vibrate([50]);
      onActivate();
      lastTapRef.current = 0;
    } else {
      speak(label);
      lastTapRef.current = now;
    }
  }, [label, onActivate, speak]);

  return handleTap;
}
