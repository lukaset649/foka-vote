import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest } from '../../errors/app-error.js';
import { parseArtworkMeta } from '../../lib/artwork-meta.js';
import {
  addAlbumPhotos,
  ALBUM_ACCESS_COOKIE_MAX_AGE_MS,
  albumAccessCookieName,
  getPublicAlbum,
  listGalleryAlbums,
  verifyAlbumAccessCode,
} from './service.js';

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

export async function getOne(request: Request, response: Response): Promise<void> {
  const album = await getPublicAlbum(
    requireSlugParam(request),
    request.signedCookies as Record<string, string | undefined>,
  );
  response.json(album);
}

export async function verifyAccess(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const { code } = request.body as { code?: unknown };

  if (typeof code !== 'string' || code.length === 0) {
    throw badRequest('code is required');
  }

  const { albumId } = await verifyAlbumAccessCode(slug, code);

  response.cookie(albumAccessCookieName(albumId), code, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: ALBUM_ACCESS_COOKIE_MAX_AGE_MS,
  });
  response.status(204).end();
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
    request.signedCookies as Record<string, string | undefined>,
  );

  response.status(201).end();
}
