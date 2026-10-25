import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest } from '../../errors/app-error.js';
import { parseArtworkMeta } from '../../lib/artwork-meta.js';
import { parseSubmissionPhotos } from '../../lib/submission-photos.js';
import { requireSingleUpload, requireUploadIdParam } from '../../lib/upload.js';
import {
  addAlbumPhotos,
  addPendingAlbumUpload,
  ALBUM_ACCESS_COOKIE_MAX_AGE_MS,
  albumAccessCookieName,
  createAlbumSubmission,
  getPublicAlbum,
  listGalleryAlbums,
  removePendingAlbumUpload,
  verifyAlbumAccessCode,
} from './service.js';

function requireSlugParam(request: Request): string {
  const { slug } = request.params;
  if (typeof slug !== 'string' || slug.length === 0) {
    throw badRequest('slug is required');
  }
  return slug;
}

export async function list(_request: Request, response: Response): Promise<void> {
  const albums = await listGalleryAlbums();
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

export async function uploadPhoto(request: Request, response: Response): Promise<void> {
  const upload = await addPendingAlbumUpload(
    requireSlugParam(request),
    requireSingleUpload(request),
    request.signedCookies as Record<string, string | undefined>,
  );
  response.status(201).json(upload);
}

export async function removeUpload(request: Request, response: Response): Promise<void> {
  await removePendingAlbumUpload(
    requireSlugParam(request),
    requireUploadIdParam(request),
    request.signedCookies as Record<string, string | undefined>,
  );
  response.status(204).end();
}

export async function createSubmission(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const { firstName, lastName, photos, rulesAccepted } = body;

  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw badRequest('firstName is required');
  }
  if (typeof lastName !== 'string' || lastName.trim().length === 0) {
    throw badRequest('lastName is required');
  }
  if (rulesAccepted !== true) {
    throw badRequest('rulesAccepted must be accepted');
  }

  await createAlbumSubmission(
    slug,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      photos: parseSubmissionPhotos(photos, 'photos'),
    },
    request.signedCookies as Record<string, string | undefined>,
  );

  response.status(201).end();
}
