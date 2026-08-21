import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info('Request completed', {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      requestId: request.requestId,
    });
  });

  next();
}
