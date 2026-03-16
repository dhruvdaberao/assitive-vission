export async function analyzeScene(base64Image: string, prompt: string, retries = 2): Promise<string> {
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          prompt,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          return 'Vision API key invalid.';
        }

        if (response.status === 429) {
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          return 'TOKENS_FINISHED';
        }

        if (response.status >= 500 && response.status < 600 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        throw new Error((data as { error?: string }).error || 'Vision service failed');
      }

      return (data as { text?: string }).text || "I couldn't analyze the scene.";
    } catch (error: unknown) {
      console.error(`Vision API Error (Attempt ${attempt + 1}):`, error);

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      return 'Vision service temporarily unavailable.';
    }
  }

  return 'Error connecting to the vision service.';
}
