import { describe, expect, it } from 'vitest';
import { mediaUrl } from '../../src/lib/storage.js';

describe('mediaUrl', () => {
  it.each([
    ['variants/abc-thumb.webp', '/media/abc-thumb.webp'],
    ['originals/abc.jpg', '/media/abc.jpg'],
  ])('maps %s to %s', (storedPath, url) => {
    expect(mediaUrl(storedPath)).toBe(url);
  });
});
