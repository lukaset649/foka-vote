import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { TEST_ENV, TEST_UPLOADS_DIR } from './env.js';

const require = createRequire(import.meta.url);
const apiRoot = path.resolve(import.meta.dirname, '..');

export default async function globalSetup(): Promise<void> {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_ENV.DATABASE_URL },
    stdio: 'pipe',
  });

  await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
  await mkdir(path.join(TEST_UPLOADS_DIR, 'originals'), { recursive: true });
  await mkdir(path.join(TEST_UPLOADS_DIR, 'variants'), { recursive: true });
}
