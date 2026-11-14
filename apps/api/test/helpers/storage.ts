import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TEST_UPLOADS_DIR } from '../env.js';

export async function writeStoredFiles(storedPaths: string[]): Promise<void> {
  await Promise.all(
    storedPaths.map(async (storedPath) => {
      const filePath = path.join(TEST_UPLOADS_DIR, storedPath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, 'image');
    }),
  );
}

export async function storedFileExists(storedPath: string): Promise<boolean> {
  try {
    await access(path.join(TEST_UPLOADS_DIR, storedPath));
    return true;
  } catch {
    return false;
  }
}
