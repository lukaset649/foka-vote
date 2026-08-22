import type { HealthStatus } from '@foka-vote/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';

async function checkDatabase(): Promise<'ok' | 'error'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'error';
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const database = await checkDatabase();

  return {
    status: database === 'ok' ? 'ok' : 'error',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database,
  };
}
