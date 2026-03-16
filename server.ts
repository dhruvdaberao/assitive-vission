import cors from "cors";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import twilio from "twilio";
import { createServer as createViteServer } from "vite";

type TtsRequestBody = {
  text?: string;
  language?: string;
  targetLanguageCode?: string;
};

type TtsVendorAttempt = {
  url: string;
  headers: Record<string, string>;
};

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT ?? 3000);

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/vision", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "Vision API key invalid or missing." });
      }

      const { image, prompt } = req.body ?? {};
      if (!image || !prompt) {
        return res.status(400).json({ error: "Image and prompt are required." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: image,
              mimeType: "image/jpeg",
            },
          },
          prompt,
        ],
        config: {
          systemInstruction:
            "You are an AI assistant for a visually impaired user. Keep your responses extremely concise, calm, and clear. Use short sentences. Prioritize safety and immediate obstacles.",
          temperature: 0.4,
        },
      });

      return res.json({ text: response.text || "I couldn't analyze the scene." });
    } catch (error: unknown) {
      console.error("Gemini API Error:", error);

      const err = error as { status?: number; message?: string };
      if (err.status === 429 || err.message?.includes("429")) {
        return res.status(429).json({ error: "Vision service rate limit exceeded." });
      }

      return res.status(500).json({ error: "Vision service temporarily unavailable." });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const apiKey = process.env.SARVAM_API_KEY;
      const { text, language, targetLanguageCode } = (req.body ?? {}) as TtsRequestBody;
      const resolvedLanguage = targetLanguageCode || language || "en-IN";

      if (!text?.trim()) {
        return res.status(400).json({ error: "Text is required." });
      }

      if (!apiKey) {
        return res.status(501).json({ error: "SARVAM_API_KEY is missing. Use browser TTS fallback." });
      }

      const payload = {
        inputs: [text],
        target_language_code: resolvedLanguage,
        speaker: "meera",
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 24000,
        enable_preprocessing: true,
        model: "bulbul:v1",
      };

      const attempts: TtsVendorAttempt[] = [
        {
          url: "https://api.sarvam.ai/v1/text-to-speech",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
        {
          url: "https://api.sarvam.ai/text-to-speech",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": apiKey,
          },
        },
      ];

      let lastStatus = 502;
      let lastError = "TTS service error.";

      for (const attempt of attempts) {
        const response = await fetch(attempt.url, {
          method: "POST",
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
          lastError = "No audio returned from vendor.";
          continue;
        }

        return res.json({ audio, audioBase64: audio });
      }

      return res.status(lastStatus).json({ error: "TTS service error.", details: lastError });
    } catch (error: unknown) {
      console.error("TTS Proxy Error:", error);
      return res.status(500).json({ error: "TTS service temporarily unavailable." });
    }
  });

  app.post("/api/send-whatsapp", async (req, res) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = process.env.TWILIO_AUTH_TOKEN;
    const sender = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!sid || !auth || !sender) {
      return res.status(500).json({ error: "Twilio credentials missing on server." });
    }

    try {
      const client = twilio(sid, auth);
      const { type, userName, destinationName, notifyNumbers, currentLat, currentLng } = req.body ?? {};

      if (!notifyNumbers || !Array.isArray(notifyNumbers) || notifyNumbers.length === 0) {
        return res.status(400).json({ error: "At least one receiver number (`notifyNumbers` array) is required." });
      }

      let baseMessage = "";
      if (type === "reached") {
        baseMessage = `User ${userName || "User"} has reached ${destinationName}.`;
      } else {
        baseMessage = `User ${userName || "User"} is out of ${destinationName} and is on the way.`;
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
          results.push({ number, sid: message.sid, status: "sent" });
        } catch (err: any) {
          console.error(`Failed to send WhatsApp to ${number}:`, err?.message || err);
          errors.push({ number, error: err?.message || "Unknown Twilio Error" });
        }
      }

      if (results.length === 0 && errors.length > 0) {
        return res.status(500).json({ error: "Failed to send WhatsApp to all numbers.", details: errors });
      }

      return res.status(200).json({ success: true, sent: results.length, failed: errors.length, errors });
    } catch (error: any) {
      console.error("Twilio Initialization Error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
