import cors from 'cors';
import express, { json } from 'express';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(json());

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'api' });
  });

  return app;
}
