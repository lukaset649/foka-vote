import type { NextFunction, Request, Response } from 'express';
import { MAX_ARTWORK_FILE_SIZE_BYTES } from '@foka-vote/shared';
// eslint-disable-next-line import/no-named-as-default -- multer's `export =` typing has no real named export to collide with
import multer from 'multer';
import { badRequest } from '../errors/app-error.js';

export function uploadArtworks(fieldName: string, maxCount: number) {
  const upload = multer({
    // eslint-disable-next-line import/no-named-as-default-member -- multer's `export =` typing has no real named export to collide with
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_ARTWORK_FILE_SIZE_BYTES, files: maxCount },
  }).array(fieldName, maxCount);

  return (request: Request, response: Response, next: NextFunction): void => {
    upload(request, response, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      // eslint-disable-next-line import/no-named-as-default-member -- see above
      if (error instanceof multer.MulterError) {
        next(badRequest(error.message));
        return;
      }
      next(error);
    });
  };
}
