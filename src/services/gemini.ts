export async function analyzeScene(base64Image: string, prompt: string, retries = 2): Promise<string> {
  const base64Data = base64Image.split(',')[1];
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Data,
          prompt: prompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) return "Vision API key invalid.";
        if (response.status === 429) {
          if (i < retries) {
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            continue;
          }
          return "Vision service rate limit exceeded.";
        }
        throw new Error(data.error || "Vision service failed");
      }

      return data.text || "I couldn't analyze the scene.";
    } catch (error: unknown) {
      console.error(`Vision API Error (Attempt ${i + 1}):`, error);
      
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      
      return "Vision service temporarily unavailable.";
    }
  }
  
  return "Error connecting to the vision service.";
}
