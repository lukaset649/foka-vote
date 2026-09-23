import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest } from '../../errors/app-error.js';
import { parseArtworkMeta } from '../../lib/artwork-meta.js';
import { addAlbumPhotos, createAlbum, getPublicAlbum, listGalleryAlbums } from './service.js';
import {
  GALLERY_ACCESS_COOKIE_MAX_AGE_MS,
  GALLERY_ACCESS_COOKIE_NAME,
  verifyGalleryAccessCode,
} from './settings.service.js';

function requireSlugParam(request: Request): string {
  const { slug } = request.params;
  if (typeof slug !== 'string' || slug.length === 0) {
    throw badRequest('slug is required');
  }
  return slug;
}

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

export async function getOne(request: Request, response: Response): Promise<void> {
  const album = await getPublicAlbum(requireSlugParam(request));
  response.json(album);
}

export async function addPhotos(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const { firstName, lastName, meta, rulesAccepted } = request.body as Record<string, unknown>;

  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw badRequest('firstName is required');
  }
  if (typeof lastName !== 'string' || lastName.trim().length === 0) {
    throw badRequest('lastName is required');
  }
  if (rulesAccepted !== 'true') {
    throw badRequest('rulesAccepted must be accepted');
  }

  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  const photosMeta = parseArtworkMeta(meta);

  await addAlbumPhotos(
    slug,
    { firstName: firstName.trim(), lastName: lastName.trim() },
    files,
    photosMeta,
  );

  // The photos stay invisible until an admin approves them, so nothing is returned.
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
