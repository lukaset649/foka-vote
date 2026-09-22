import type { NextFunction, Request, Response } from 'express';
import { assertGalleryAccess } from './settings.service.js';

export async function requireGalleryAccess(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  await assertGalleryAccess(request.signedCookies as Record<string, string | undefined>);
  next();
}
