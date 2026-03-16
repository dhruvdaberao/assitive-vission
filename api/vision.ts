import { handleVisionRequest } from '../src/server/apiHandlers.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await handleVisionRequest(req.body ?? {});
  return res.status(result.status).json(result.body);
}
