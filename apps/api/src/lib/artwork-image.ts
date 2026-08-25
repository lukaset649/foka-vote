import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MIN_ARTWORK_DIMENSION_PX } from '@foka-vote/shared';
// eslint-disable-next-line import/no-named-as-default -- sharp's `export =` typing has no real named export to collide with
import sharp from 'sharp';
import { badRequest } from '../errors/app-error.js';
import { ORIGINALS_DIR, VARIANTS_DIR } from './storage.js';

const PREVIEW_MAX_DIMENSION_PX = 2560;
const THUMB_MAX_DIMENSION_PX = 600;
const THUMB_QUALITY = 75;

export interface ArtworkImageResult {
  filePath: string;
  previewPath: string;
  thumbPath: string;
  width: number;
  height: number;
}

async function readMetadata(buffer: Buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch {
    throw badRequest('Invalid image file');
  }
}

export async function processArtworkImage(buffer: Buffer): Promise<ArtworkImageResult> {
  const metadata = await readMetadata(buffer);

  if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
    throw badRequest('Only JPEG and PNG images are allowed');
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (Math.max(width, height) < MIN_ARTWORK_DIMENSION_PX) {
    throw badRequest(`Image must be at least ${MIN_ARTWORK_DIMENSION_PX}px on the longer side`);
  }

  const id = randomUUID();
  const ext = metadata.format === 'png' ? 'png' : 'jpg';
  const previewQuality = metadata.format === 'png' ? 92 : 82;

  const filePath = `originals/${id}.${ext}`;
  const previewPath = `variants/${id}-preview.webp`;
  const thumbPath = `variants/${id}-thumb.webp`;

  await writeFile(path.join(ORIGINALS_DIR, `${id}.${ext}`), buffer);

  await sharp(buffer)
    .rotate()
    .resize(PREVIEW_MAX_DIMENSION_PX, PREVIEW_MAX_DIMENSION_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: previewQuality })
    .toFile(path.join(VARIANTS_DIR, `${id}-preview.webp`));

  await sharp(buffer)
    .rotate()
    .resize(THUMB_MAX_DIMENSION_PX, THUMB_MAX_DIMENSION_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_QUALITY })
    .toFile(path.join(VARIANTS_DIR, `${id}-thumb.webp`));

  return { filePath, previewPath, thumbPath, width, height };
}
