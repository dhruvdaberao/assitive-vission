import { GoogleGenAI } from '@google/genai';

type JsonResult = {
  status: number;
  body: Record<string, unknown>;
};

type TtsRequestBody = {
  text?: string;
  language?: string;
  targetLanguageCode?: string;
};

type VisionRequestBody = {
  image?: string;
  prompt?: string;
};

type WhatsAppRequestBody = {
  type?: 'reached' | 'left';
  userName?: string;
  destinationName?: string;
  notifyNumbers?: string[];
  currentLat?: number;
  currentLng?: number;
};

type TtsVendorAttempt = {
  url: string;
  headers: Record<string, string>;
};

export async function handleVisionRequest(body: VisionRequestBody): Promise<JsonResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { status: 401, body: { error: 'Vision API key invalid or missing.' } };
    }

    const { image, prompt } = body;
    if (!image || !prompt) {
      return { status: 400, body: { error: 'Image and prompt are required.' } };
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: image,
            mimeType: 'image/jpeg',
          },
        },
        prompt,
      ],
      config: {
        systemInstruction:
          'You are an AI assistant for a visually impaired user. Keep your responses extremely concise, calm, and clear. Use short sentences. Prioritize safety and immediate obstacles.',
        temperature: 0.4,
      },
    });

    return {
      status: 200,
      body: { text: response.text || "I couldn't analyze the scene." },
    };
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    const err = error as { status?: number; message?: string };
    if (err.status === 429 || err.message?.includes('429')) {
      return { status: 429, body: { error: 'Vision service rate limit exceeded.' } };
    }

    return {
      status: 500,
      body: {
        error: 'Vision service temporarily unavailable.',
        details: err.message || 'Unknown vision error.',
      },
    };
  }
}

export async function handleTtsRequest(body: TtsRequestBody): Promise<JsonResult> {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    const { text, language, targetLanguageCode } = body;
    const resolvedLanguage = targetLanguageCode || language || 'en-IN';

    if (!text?.trim()) {
      return { status: 400, body: { error: 'Text is required.' } };
    }

    if (!apiKey) {
      return { status: 501, body: { error: 'SARVAM_API_KEY is missing. Use browser TTS fallback.' } };
    }

    const payload = {
      inputs: [text],
      target_language_code: resolvedLanguage,
      speaker: 'meera',
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 24000,
      enable_preprocessing: true,
      model: 'bulbul:v1',
    };

    const attempts: TtsVendorAttempt[] = [
      {
        url: 'https://api.sarvam.ai/v1/text-to-speech',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      },
      {
        url: 'https://api.sarvam.ai/text-to-speech',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
      },
    ];

    let lastStatus = 502;
    let lastError = 'TTS service error.';

    for (const attempt of attempts) {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: attempt.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastError = await response.text();
        console.error(`Sarvam API Error (${attempt.url}):`, lastError);
        continue;
      }

      const data = (await response.json()) as { audios?: string[] };
      const audio = data.audios?.[0];
      if (!audio) {
        lastStatus = 502;
        lastError = 'No audio returned from vendor.';
        continue;
      }

      return {
        status: 200,
        body: { audio, audioBase64: audio },
      };
    }

    return { status: lastStatus, body: { error: 'TTS service error.', details: lastError } };
  } catch (error: unknown) {
    console.error('TTS Proxy Error:', error);
    const err = error as { message?: string };
    return {
      status: 500,
      body: {
        error: 'TTS service temporarily unavailable.',
        details: err.message || 'Unknown TTS error.',
      },
    };
  }
}

export async function handleWhatsAppRequest(body: WhatsAppRequestBody): Promise<JsonResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const sender = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !auth || !sender) {
    return { status: 500, body: { error: 'Twilio credentials missing on server.' } };
  }

  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(sid, auth);
    const { type, userName, destinationName, notifyNumbers, currentLat, currentLng } = body;

    if (!notifyNumbers || !Array.isArray(notifyNumbers) || notifyNumbers.length === 0) {
      return {
        status: 400,
        body: { error: 'At least one receiver number (`notifyNumbers` array) is required.' },
      };
    }

    let baseMessage = '';
    if (type === 'reached') {
      baseMessage = `User ${userName || 'User'} has reached ${destinationName}.`;
    } else {
      baseMessage = `User ${userName || 'User'} is out of ${destinationName} and is on the way.`;
    }

    if (currentLat && currentLng) {
      const mapsLink = `https://www.openstreetmap.org/?mlat=${currentLat}&mlon=${currentLng}`;
      baseMessage += `\nLive Location: ${mapsLink}`;
    }

    const results: Array<{ number: string; sid: string; status: string }> = [];
    const errors: Array<{ number: string; error: string }> = [];

    for (const number of notifyNumbers) {
      try {
        const message = await client.messages.create({
          body: baseMessage,
          from: `whatsapp:${sender}`,
          to: `whatsapp:${number}`,
        });
        results.push({ number, sid: message.sid, status: 'sent' });
      } catch (error: any) {
        console.error(`Failed to send WhatsApp to ${number}:`, error?.message || error);
        errors.push({ number, error: error?.message || 'Unknown Twilio Error' });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return {
        status: 500,
        body: { error: 'Failed to send WhatsApp to all numbers.', details: errors },
      };
    }

    return {
      status: 200,
      body: { success: true, sent: results.length, failed: errors.length, errors },
    };
  } catch (error: any) {
    console.error('Twilio Initialization Error:', error);
    return { status: 500, body: { error: error.message, details: error.message } };
  }
}
