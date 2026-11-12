import os from 'node:os';
import path from 'node:path';
import { hashPassword } from '../src/lib/password.js';

export const TEST_ADMIN_PASSWORD = 'test-admin-password';

export const TEST_UPLOADS_DIR = path.join(os.tmpdir(), 'foka-vote-api-tests', 'uploads');

export const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    'postgresql://foka:foka@localhost:5433/foka_vote_test?schema=public',
  ADMIN_PASSWORD_HASH: hashPassword(TEST_ADMIN_PASSWORD),
  COOKIE_SECRET: 'test-cookie-secret-that-is-at-least-32-characters-long',
  UPLOADS_DIR: TEST_UPLOADS_DIR,
};

export function assertTestDatabase(databaseUrl: string | undefined): void {
  const name = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : '';
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against database "${name}": its name must end with "_test".`,
    );
  }
}
