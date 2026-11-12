import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { assertTestDatabase, TEST_ENV, TEST_UPLOADS_DIR } from './env.js';

const require = createRequire(import.meta.url);
const apiRoot = path.resolve(import.meta.dirname, '..');

function migrateTestDatabase(): void {
  try {
    execFileSync(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      {
        cwd: apiRoot,
        env: { ...process.env, DATABASE_URL: TEST_ENV.DATABASE_URL },
        stdio: 'pipe',
      },
    );
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    const output = `${stdout?.toString() ?? ''}${stderr?.toString() ?? ''}`.trim();
    throw new Error(
      `Could not migrate the test database. Is it running? Start it with ` +
        `"docker compose up -d db" (tests connect to localhost:5433 unless TEST_DATABASE_URL is set).\n\n${output}`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  assertTestDatabase(TEST_ENV.DATABASE_URL);
  migrateTestDatabase();

  await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
  await mkdir(path.join(TEST_UPLOADS_DIR, 'originals'), { recursive: true });
  await mkdir(path.join(TEST_UPLOADS_DIR, 'variants'), { recursive: true });
}
