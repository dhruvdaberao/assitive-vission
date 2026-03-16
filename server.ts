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

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, language } = req.body;
      const apiKey = process.env.SARVAM_API_KEY;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (!apiKey) {
        // Safe fallback when no key is present instead of crashing the backend
        return res.status(501).json({ error: "SARVAM_API_KEY is missing, use browser native TTS" });
      }

      // Try fetching from Sarvam AI if a key exists
      const sarvamResponse = await fetch("https://api.sarvam.ai/v1/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: [text],
          target_language_code: language || "en-IN",
          speaker: "meera",
          pitch: 0,
          pace: 1.0,
          loudness: 1.5,
          speech_sample_rate: 8000,
          enable_preprocessing: true,
          model: "bulbul:v1"
        }),
      });

      if (!sarvamResponse.ok) {
        const errText = await sarvamResponse.text();
        console.error("Sarvam API error:", errText);
        return res.status(sarvamResponse.status).json({ error: "TTS generation failed on vendor side" });
      }

      const data = await sarvamResponse.json();
      if (data.audios && data.audios[0]) {
        // Send base64 back
        return res.json({ audio: data.audios[0] });
      } else {
        return res.status(500).json({ error: "No audio returned from vendor" });
      }
    } catch (error) {
      console.error("TTS Proxy Error:", error);
      res.status(500).json({ error: "Internal TTS proxy failure" });
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
