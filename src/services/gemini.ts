export async function analyzeScene(base64Image: string, prompt: string, retries = 2): Promise<string> {
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  let lastError = 'Vision service temporarily unavailable.';

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
        const errorData = data as { error?: string; details?: string; code?: string; requestId?: string };
        const serverError = errorData.error || lastError;
        lastError = serverError;

        if (response.status === 401) {
          return serverError;
        }

        if (response.status === 400) {
          return 'Unable to process the captured image. Please try again.';
        }

        if ((response.status === 500 || response.status === 503) && errorData.code === 'VISION_CONFIG_MISSING') {
          return 'Vision service is not configured on the server.';
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

        if (errorData.requestId) {
          console.error(`Vision server requestId: ${errorData.requestId}`);
        }

        throw new Error(errorData.details || serverError);
      }

      return (data as { text?: string }).text || "I couldn't analyze the scene.";
    } catch (error: unknown) {
      console.error(`Vision API Error (Attempt ${attempt + 1}):`, error);
      if (error instanceof Error && error.message) {
        lastError = error.message;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      return lastError;
    }
  }

  return lastError || 'Error connecting to the vision service.';
}
