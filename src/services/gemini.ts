import { GoogleGenAI } from '@google/genai';

export async function analyzeScene(base64Image: string, prompt: string, retries = 2): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Vision API key invalid or missing.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.split(',')[1];
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
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
      return response.text || "I couldn't analyze the scene.";
    } catch (error: unknown) {
      console.error(`Gemini API Error (Attempt ${i + 1}):`, error);
      
      const err = error as any;
      
      if (err.status === 401 || err.message?.includes('401') || err.message?.includes('API key not valid')) {
        return "Vision API key invalid.";
      }
      
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        if (i < retries) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        return "Vision service rate limit exceeded.";
      }
      
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      
      return "Vision service temporarily unavailable.";
    }
  }
  
  return "Error connecting to the vision service.";
}
