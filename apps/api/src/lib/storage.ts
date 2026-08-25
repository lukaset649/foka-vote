import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
export const VARIANTS_DIR = path.join(UPLOADS_DIR, 'variants');

export async function ensureUploadDirs(): Promise<void> {
  await mkdir(ORIGINALS_DIR, { recursive: true });
  await mkdir(VARIANTS_DIR, { recursive: true });
}
