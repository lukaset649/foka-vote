import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { assertTestDatabase } from './env.js';

assertTestDatabase(process.env.DATABASE_URL);

let truncateStatement: Promise<string | null> | undefined;

async function buildTruncateStatement(): Promise<string | null> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) {
    return null;
  }
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  return `TRUNCATE TABLE ${list} CASCADE`;
}

beforeEach(async () => {
  truncateStatement ??= buildTruncateStatement();
  const statement = await truncateStatement;
  if (statement !== null) {
    await prisma.$executeRawUnsafe(statement);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
