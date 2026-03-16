import cors from 'cors';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  handleTtsRequest,
  handleVisionRequest,
  handleWhatsAppRequest,
} from './src/server/apiHandlers.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT ?? 3000);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/vision', async (req, res) => {
    const result = await handleVisionRequest(req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.post('/api/tts', async (req, res) => {
    const result = await handleTtsRequest(req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.post('/api/send-whatsapp', async (req, res) => {
    const result = await handleWhatsAppRequest(req.body ?? {});
    res.status(result.status).json(result.body);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
