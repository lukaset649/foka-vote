import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
export const VARIANTS_DIR = path.join(UPLOADS_DIR, 'variants');

export const MEDIA_URL_PREFIX = '/media';

/** Best-effort cleanup of stored files; a missing file is not an error worth surfacing. */
export async function removeStoredFiles(relativePaths: string[]): Promise<void> {
  await Promise.all(
    relativePaths.map((relativePath) =>
      unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => undefined),
    ),
  );
}

/** Maps a stored relative path (originals/… or variants/…) to its public media URL. */
export function mediaUrl(storedPath: string): string {
  return `${MEDIA_URL_PREFIX}/${path.basename(storedPath)}`;
}

export async function ensureUploadDirs(): Promise<void> {
  await mkdir(ORIGINALS_DIR, { recursive: true });
  await mkdir(VARIANTS_DIR, { recursive: true });
}
