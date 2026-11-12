import { stat } from 'node:fs/promises';
import path from 'node:path';
import { MIN_ARTWORK_DIMENSION_PX } from '@foka-vote/shared';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processArtworkImage } from '../../src/lib/artwork-image.js';
import { TEST_UPLOADS_DIR } from '../env.js';
import { expectAppErrorAsync } from '../helpers/errors.js';
import { fixtureImage } from '../helpers/images.js';

describe('processArtworkImage', () => {
  it('stores the original and webp variants of a JPEG', async () => {
    const result = await processArtworkImage(await fixtureImage({ width: 1200, height: 900 }));

    expect(result.filePath).toMatch(/^originals\/[\w-]+\.jpg$/);
    expect(result.previewPath).toMatch(/^variants\/[\w-]+-preview\.webp$/);
    expect(result.thumbPath).toMatch(/^variants\/[\w-]+-thumb\.webp$/);
    expect(result).toMatchObject({ width: 1200, height: 900 });

    await expect(stat(path.join(TEST_UPLOADS_DIR, result.filePath))).resolves.toBeDefined();

    const thumb = await sharp(path.join(TEST_UPLOADS_DIR, result.thumbPath)).metadata();
    expect(thumb).toMatchObject({ format: 'webp', width: 600, height: 450 });

    const preview = await sharp(path.join(TEST_UPLOADS_DIR, result.previewPath)).metadata();
    expect(preview).toMatchObject({ format: 'webp', width: 1200, height: 900 });
  });

  it('keeps the png extension for PNG originals', async () => {
    const result = await processArtworkImage(await fixtureImage({ format: 'png' }));

    expect(result.filePath).toMatch(/\.png$/);
  });

  it('accepts an image whose longer side is exactly the minimum', async () => {
    const result = await processArtworkImage(
      await fixtureImage({ width: 100, height: MIN_ARTWORK_DIMENSION_PX }),
    );

    expect(result.height).toBe(MIN_ARTWORK_DIMENSION_PX);
  });

  it('rejects an image below the minimum dimension', async () => {
    const buffer = await fixtureImage({
      width: MIN_ARTWORK_DIMENSION_PX - 1,
      height: MIN_ARTWORK_DIMENSION_PX - 1,
    });

    await expectAppErrorAsync(processArtworkImage(buffer), 400, 'VALIDATION_FAILED');
  });

  it('rejects a format other than JPEG or PNG', async () => {
    const webp = await sharp(await fixtureImage())
      .webp()
      .toBuffer();

    await expectAppErrorAsync(processArtworkImage(webp), 400, 'VALIDATION_FAILED');
  });

  it('rejects bytes that are not an image', async () => {
    await expectAppErrorAsync(
      processArtworkImage(Buffer.from('not an image')),
      400,
      'VALIDATION_FAILED',
    );
  });
});
