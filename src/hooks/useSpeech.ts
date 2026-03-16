import React, { useCallback, useEffect, useRef, useState } from 'react';

export const LANGUAGE_CONFIG = {
  English: { code: 'en-IN', voice: 'meera', confirmText: 'I will now speak in English.' },
  Hindi: { code: 'hi-IN', voice: 'meera', confirmText: 'आपकी भाषा पसंद सुरक्षित कर दी गई है।' },
  Marathi: { code: 'mr-IN', voice: 'meera', confirmText: 'तुमची भाषा निवड जतन केली आहे.' },
  Tamil: { code: 'ta-IN', voice: 'meera', confirmText: 'உங்கள் மொழி விருப்பம் சேமிக்கப்பட்டது.' },
  Telugu: { code: 'te-IN', voice: 'meera', confirmText: 'మీ భాష ఎంపిక సేవ్ చేయబడింది.' },
  Bengali: { code: 'bn-IN', voice: 'meera', confirmText: 'আপনার ভাষা পছন্দ সংরক্ষণ করা হয়েছে।' },
  Gujarati: { code: 'gu-IN', voice: 'meera', confirmText: 'તમારી ભાષા પસંદગી સાચવવામાં આવી છે.' },
  Kannada: { code: 'kn-IN', voice: 'meera', confirmText: 'ನಿಮ್ಮ ಭಾಷೆಯ ಆಯ್ಕೆಯನ್ನು ಉಳಿಸಲಾಗಿದೆ.' },
  Malayalam: { code: 'ml-IN', voice: 'meera', confirmText: 'നിങ്ങളുടെ ഭാഷാ മുൻഗണന സംരക്ഷിച്ചു.' },
  Punjabi: { code: 'pa-IN', voice: 'meera', confirmText: 'ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਦੀ ਤਰਜੀਹ ਸੁਰੱਖਿਅਤ ਕੀਤੀ ਗਈ ਹੈ।' },
  Odia: { code: 'od-IN', voice: 'meera', confirmText: 'ଆପଣଙ୍କର ଭାଷା ପସନ୍ଦ ସଂରକ୍ଷଣ କରାଯାଇଛି |' },
  Assamese: { code: 'as-IN', voice: 'meera', confirmText: 'আপোনাৰ ভাষা পছন্দ সংৰক্ষণ কৰা হৈছে।' },
  Manipuri: { code: 'mni-IN', voice: 'meera', confirmText: 'নহাক্কী লোনগী পামজবা অদু সেভ তৌরে।' },
  Bodo: { code: 'brx-IN', voice: 'meera', confirmText: 'नोंथांनि रावखौ रैखा खालामनाय जाबाय।' },
  Urdu: { code: 'ur-IN', voice: 'meera', confirmText: 'آپ کی زبان کی ترجیح محفوظ کر لی گئی ہے۔' },
} as const;

export function parseSpokenNumber(text: string): number | null {
  const lower = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();

  if (lower.match(/\b(1|one|ek|एक|first|won|wan)\b/)) return 1;
  if (lower.match(/\b(2|two|do|दो|second|too|to)\b/)) return 2;
  if (lower.match(/\b(3|three|teen|तीन|third|tree)\b/)) return 3;
  if (lower.match(/\b(4|four|char|चार|fourth|for)\b/)) return 4;
  if (lower.match(/\b(5|five|panch|पांच|fifth)\b/)) return 5;
  if (lower.match(/\b(0|zero|shunya|शून्य|cancel|stop)\b/)) return 0;

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const updateState = useCallback((newState: VoiceState) => {
    stateRef.current = newState;
    setVoiceState(newState);
  }, []);

  const releaseAudioResources = useCallback(() => {
    try {
      audioSourceRef.current?.stop();
    } catch {
      // The source may already be stopped.
    }
    audioSourceRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {
        // Closing can fail if the context is already closing.
      });
      audioContextRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.abort();
      } catch {
        // Recognition may already be stopped.
      }
      recognitionRef.current = null;
    }
    if (stateRef.current === 'LISTENING') {
      updateState('IDLE');
    }
  }, [updateState]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    releaseAudioResources();
    if (stateRef.current === 'SPEAKING') {
      updateState('IDLE');
    }
  }, [releaseAudioResources, updateState]);

  const fallbackSpeak = useCallback(
    (text: string, langCode: string): Promise<void> =>
      new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 0.9;

        utterance.onend = () => {
          if (stateRef.current === 'SPEAKING') {
            updateState('IDLE');
          }
          resolve();
        };

        utterance.onerror = () => {
          if (stateRef.current === 'SPEAKING') {
            updateState('IDLE');
          }
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      }),
    [updateState],
  );

  const playBase64Audio = useCallback(
    async (base64Audio: string) => {
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }

      releaseAudioResources();

      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('AudioContext unavailable');
      }

      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
      const source = audioContext.createBufferSource();
      audioSourceRef.current = source;
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => {
          if (stateRef.current === 'SPEAKING') {
            updateState('IDLE');
          }
          resolve();
        };

        source.start(0);
        window.setTimeout(resolve, audioBuffer.duration * 1000 + 500);
      });

      releaseAudioResources();
    },
    [releaseAudioResources, updateState],
  );

  const speak = useCallback(async (text: string): Promise<void> => {
    stopListening();
    stopSpeaking();
    updateState('SPEAKING');

    const currentLang = localStorage.getItem('appLanguage') || 'English';
    const langCode = LANGUAGE_CONFIG[currentLang as keyof typeof LANGUAGE_CONFIG]?.code || 'en-IN';

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: langCode,
          targetLanguageCode: langCode,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string; details?: string; code?: string; requestId?: string };
        console.warn('TTS API returned non-OK response:', response.status, errorBody);

        if (errorBody.requestId) {
          console.warn(`TTS server requestId: ${errorBody.requestId}`);
        }

        if (response.status === 402 || response.status === 403 || response.status === 429) {
          console.warn('TTS quota exhausted, using browser speech fallback.');
        }

        if (response.status === 503 && errorBody.code === 'TTS_CONFIG_MISSING') {
          throw new Error('TTS service is not configured on server.');
        }

        throw new Error(errorBody.details || errorBody.error || `TTS proxy failed with status ${response.status}`);
      }

      const data = (await response.json()) as { audio?: string; audioBase64?: string };
      const base64Audio = data.audioBase64 || data.audio;
      if (!base64Audio) {
        throw new Error('No audio returned from API');
      }

      await playBase64Audio(base64Audio);
    } catch (error) {
      console.warn('Backend TTS unavailable, using browser speech fallback:', error);
      await fallbackSpeak(text, langCode);
    }
  }, [fallbackSpeak, playBase64Audio, stopListening, stopSpeaking, updateState]);

  const listen = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      stopListening();
      updateState('LISTENING');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        updateState('IDLE');
        void speak('Microphone permission required.');
        reject('audio-capture');
        return;
      }

      // @ts-ignore
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        updateState('IDLE');
        reject('Speech recognition not supported');
        return;
      }

      const recognition = new SpeechRecognitionCtor();
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
        if (stateRef.current !== 'LISTENING') {
          return;
        }

        const result = event.results[0][0].transcript;
        setTranscript(result);
        updateState('PROCESSING');
        resolve(result);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(timeoutId);
        if (stateRef.current !== 'LISTENING') {
          return;
        }
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
      } catch {
        updateState('IDLE');
        reject('start-failed');
      }
    });
  }, [speak, stopListening, updateState]);

  const speakAndListen = useCallback(async (text: string, retries = 2): Promise<string> => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      await speak(text);
      try {
        return await listen();
      } catch (error) {
        if (error === 'no-speech' || error === 'network' || error === 'not-allowed') {
          if (attempt < retries) {
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error('Max retries reached');
  }, [listen, speak]);

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
    transcript,
  };
}

export function useAccessibleButton(label: string, onActivate: () => void, speak: (text: string) => void) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const now = Date.now();
    const doubleTapDelay = 500;

    if (now - lastTapRef.current < doubleTapDelay) {
      if (navigator.vibrate) navigator.vibrate([50]);
      onActivate();
      lastTapRef.current = 0;
    } else {
      void speak(label);
      lastTapRef.current = now;
    }
  }, [label, onActivate, speak]);

  return handleTap;
}
