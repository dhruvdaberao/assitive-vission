import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/vision", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "Vision API key invalid or missing." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const { image, prompt } = req.body;

      if (!image || !prompt) {
        return res.status(400).json({ error: "Image and prompt are required." });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: image,
              mimeType: 'image/jpeg'
            }
          },
          prompt
        ],
        config: {
          systemInstruction: "You are an AI assistant for a visually impaired user. Keep your responses extremely concise, calm, and clear. Use short sentences. Prioritize safety and immediate obstacles.",
          temperature: 0.4,
        }
      });

      res.json({ text: response.text || "I couldn't analyze the scene." });
    } catch (error: unknown) {
      console.error("Gemini API Error:", error);
      
      const err = error as any;
      if (err.status === 429 || err.message?.includes('429')) {
        return res.status(429).json({ error: "Vision service rate limit exceeded." });
      }
      
      res.status(500).json({ error: "Vision service temporarily unavailable." });
    }
  });

  // TTS endpoint for Sarvam AI
  app.post("/api/tts", async (req, res) => {
    try {
      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "SARVAM_API_KEY missing." });
      }

      const { text, targetLanguageCode } = req.body;

      if (!text || !targetLanguageCode) {
        return res.status(400).json({ error: "Text and targetLanguageCode are required." });
      }

      const sarvamPayload = {
        inputs: [text],
        target_language_code: targetLanguageCode,
        speaker: "meera",
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 24000,
        enable_preprocessing: true,
        model: "bulbul:v1"
      };

      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey
        },
        body: JSON.stringify(sarvamPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Sarvam API Error:", errText);
        return res.status(response.status).json({ error: "TTS service error." });
      }

      const data = await response.json();
      // Sarvam returns { audios: ["base64string"] } usually for array inputs
      if (data && data.audios && data.audios.length > 0) {
         return res.json({ audioBase64: data.audios[0] });
      } else {
         return res.status(500).json({ error: "Invalid response from TTS service." });
      }
    } catch (error: unknown) {
      console.error("TTS Proxy Error:", error);
      res.status(500).json({ error: "TTS service temporarily unavailable." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
