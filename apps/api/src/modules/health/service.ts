import type { HealthStatus } from '@foka-vote/shared';
import { env } from '../../config/env.js';

// Database connectivity joins this check once Prisma is introduced (stage 7).
export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };
}
