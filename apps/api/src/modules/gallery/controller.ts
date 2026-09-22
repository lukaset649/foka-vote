import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest } from '../../errors/app-error.js';
import { createAlbum, listGalleryAlbums } from './service.js';
import {
  GALLERY_ACCESS_COOKIE_MAX_AGE_MS,
  GALLERY_ACCESS_COOKIE_NAME,
  verifyGalleryAccessCode,
} from './settings.service.js';

export async function list(request: Request, response: Response): Promise<void> {
  const albums = await listGalleryAlbums(
    request.signedCookies as Record<string, string | undefined>,
  );
  response.json(albums);
}

export async function create(request: Request, response: Response): Promise<void> {
  const { title, description } = request.body as Record<string, unknown>;

  if (typeof title !== 'string') {
    throw badRequest('title is required');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw badRequest('description must be a string');
  }

  await createAlbum({ title, ...(description !== undefined ? { description } : {}) });

  // The album is not public until an admin approves it, so no slug or link is returned.
  response.status(201).end();
}

export async function verifyAccess(request: Request, response: Response): Promise<void> {
  const { code } = request.body as { code?: unknown };

  if (typeof code !== 'string' || code.length === 0) {
    throw badRequest('code is required');
  }

  await verifyGalleryAccessCode(code);

  response.cookie(GALLERY_ACCESS_COOKIE_NAME, code, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: GALLERY_ACCESS_COOKIE_MAX_AGE_MS,
  });
  response.status(204).end();
}
