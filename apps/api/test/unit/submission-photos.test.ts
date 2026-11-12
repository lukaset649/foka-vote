import { describe, expect, it } from 'vitest';
import { parseSubmissionPhotos } from '../../src/lib/submission-photos.js';
import { expectAppError } from '../helpers/errors.js';

describe('parseSubmissionPhotos', () => {
  it('keeps the order and normalizes captions', () => {
    expect(
      parseSubmissionPhotos(
        [
          { uploadId: 'b', title: 'Sunset', description: '' },
          { uploadId: 'a', title: null },
        ],
        'photos',
      ),
    ).toEqual([
      { uploadId: 'b', title: 'Sunset', description: null },
      { uploadId: 'a', title: null, description: null },
    ]);
  });

  it('accepts an empty array', () => {
    expect(parseSubmissionPhotos([], 'photos')).toEqual([]);
  });

  it.each([
    ['not an array', { uploadId: 'a' }],
    ['a non-object entry', ['a']],
    ['a null entry', [null]],
    ['a missing uploadId', [{ title: 'x' }]],
    ['an empty uploadId', [{ uploadId: '' }]],
    ['a non-string title', [{ uploadId: 'a', title: 1 }]],
    ['a non-string description', [{ uploadId: 'a', description: {} }]],
  ])('rejects %s', (_case, raw) => {
    expectAppError(() => parseSubmissionPhotos(raw, 'photos'), 400, 'VALIDATION_FAILED');
  });
});
