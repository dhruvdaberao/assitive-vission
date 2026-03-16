import { handleTtsRequest } from '../src/server/apiHandlers.ts';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await handleTtsRequest(req.body ?? {});
  return res.status(result.status).json(result.body);
}
