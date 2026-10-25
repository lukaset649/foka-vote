import { PENDING_UPLOAD_TTL_HOURS } from '@foka-vote/shared';
import type { PendingUpload, Prisma } from '../generated/prisma/client.js';
import { badRequest } from '../errors/app-error.js';
import { processArtworkImage } from './artwork-image.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import { removeStoredFiles } from './storage.js';

const PENDING_UPLOAD_TTL_MS = PENDING_UPLOAD_TTL_HOURS * 60 * 60 * 1000;

export type PendingUploadTarget = { albumId: string } | { contestId: string };

function storedPaths(upload: Pick<PendingUpload, 'filePath' | 'previewPath' | 'thumbPath'>) {
  return [upload.filePath, upload.previewPath, upload.thumbPath];
}

function expiryCutoff(): Date {
  return new Date(Date.now() - PENDING_UPLOAD_TTL_MS);
}

export async function createPendingUpload(
  target: PendingUploadTarget,
  buffer: Buffer,
): Promise<PendingUpload> {
  const processed = await processArtworkImage(buffer);
  try {
    return await prisma.pendingUpload.create({
      data: {
        ...target,
        filePath: processed.filePath,
        previewPath: processed.previewPath,
        thumbPath: processed.thumbPath,
        width: processed.width,
        height: processed.height,
      },
    });
  } catch (error) {
    await removeStoredFiles(storedPaths(processed));
    throw error;
  }
}

/** Removes the row and its files right away; an unknown id is not an error (the upload may have expired). */
export async function deletePendingUpload(target: PendingUploadTarget, id: string): Promise<void> {
  const upload = await prisma.pendingUpload.findFirst({ where: { id, ...target } });
  if (!upload) {
    return;
  }
  const { count } = await prisma.pendingUpload.deleteMany({ where: { id, ...target } });
  if (count > 0) {
    await removeStoredFiles(storedPaths(upload));
  }
}

/**
 * Takes ownership of the given uploads inside a submission transaction and returns them in the
 * order of `ids`. Their files stay where they are and are referenced by the new photo rows.
 */
export async function claimPendingUploads(
  tx: Prisma.TransactionClient,
  target: PendingUploadTarget,
  ids: string[],
): Promise<PendingUpload[]> {
  if (new Set(ids).size !== ids.length) {
    throw badRequest('Each upload can be used only once');
  }

  const uploads = await tx.pendingUpload.findMany({
    where: { id: { in: ids }, ...target, createdAt: { gte: expiryCutoff() } },
  });
  // Deleting before use also guards against two concurrent submissions claiming the same upload.
  const { count } = await tx.pendingUpload.deleteMany({
    where: { id: { in: uploads.map((upload) => upload.id) } },
  });
  if (uploads.length !== ids.length || count !== ids.length) {
    throw badRequest('Some uploaded photos are missing or expired, please add them again');
  }

  const byId = new Map(uploads.map((upload) => [upload.id, upload]));
  return ids.map((id) => byId.get(id) as PendingUpload);
}

/** File paths of all pending uploads of an album or contest, for cleanup before it is deleted. */
export async function pendingUploadPaths(target: PendingUploadTarget): Promise<string[]> {
  const uploads = await prisma.pendingUpload.findMany({
    where: target,
    select: { filePath: true, previewPath: true, thumbPath: true },
  });
  return uploads.flatMap(storedPaths);
}

export async function removeExpiredPendingUploads(): Promise<void> {
  const expired = await prisma.pendingUpload.findMany({
    where: { createdAt: { lt: expiryCutoff() } },
  });

  let removed = 0;
  for (const upload of expired) {
    // Row by row, so files are kept for an upload claimed by a submission in the meantime.
    const { count } = await prisma.pendingUpload.deleteMany({ where: { id: upload.id } });
    if (count > 0) {
      await removeStoredFiles(storedPaths(upload));
      removed += 1;
    }
  }
  if (removed > 0) {
    logger.info('Removed expired pending uploads', { count: removed });
  }
}
