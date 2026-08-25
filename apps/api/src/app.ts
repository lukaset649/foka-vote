import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { json, static as serveStatic, urlencoded } from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import { env, isProduction } from './config/env.js';
import { MEDIA_URL_PREFIX, VARIANTS_DIR } from './lib/storage.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { requestId } from './middleware/request-id.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { apiRouter } from './routes.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  app.use(helmet());

  // Production serves web and api from the same origin behind nginx, so CORS is unnecessary there.
  if (!isProduction) {
    app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  }

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false }));
  app.use(cookieParser(env.COOKIE_SECRET));

  app.use(requestId);
  app.use(requestLogger);

  app.use(MEDIA_URL_PREFIX, serveStatic(VARIANTS_DIR));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
