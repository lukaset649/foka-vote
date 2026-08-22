import type { Request, Response } from 'express';
import { getHealthStatus } from './service.js';

export async function getHealth(_request: Request, response: Response): Promise<void> {
  const health = await getHealthStatus();
  response.status(health.status === 'ok' ? 200 : 503).json(health);
}
