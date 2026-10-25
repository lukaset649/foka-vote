import type { Request, Response } from 'express';
import { badRequest } from '../../errors/app-error.js';
import { parseSubmissionPhotos } from '../../lib/submission-photos.js';
import { requireSingleUpload, requireUploadIdParam } from '../../lib/upload.js';
import {
  addPendingContestUpload,
  createSubmission,
  listSubmissions,
  removePendingContestUpload,
  reserveAlias,
} from './service.js';

function requireSlugParam(request: Request): string {
  const { slug } = request.params;
  if (typeof slug !== 'string' || slug.length === 0) {
    throw badRequest('slug is required');
  }
  return slug;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function list(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const submissions = await listSubmissions(slug);
  response.json(submissions);
}

export async function reserveAliasHandler(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const reservation = await reserveAlias(
    slug,
    request.signedCookies as Record<string, string | undefined>,
  );
  response.status(201).json(reservation);
}

export async function uploadArtwork(request: Request, response: Response): Promise<void> {
  const upload = await addPendingContestUpload(
    requireSlugParam(request),
    requireSingleUpload(request),
    request.signedCookies as Record<string, string | undefined>,
  );
  response.status(201).json(upload);
}

export async function removeUpload(request: Request, response: Response): Promise<void> {
  await removePendingContestUpload(
    requireSlugParam(request),
    requireUploadIdParam(request),
    request.signedCookies as Record<string, string | undefined>,
  );
  response.status(204).end();
}

export async function create(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const { firstName, lastName, description, reservationId, rulesAccepted, artworks } = body;

  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw badRequest('firstName is required');
  }
  if (typeof lastName !== 'string' || lastName.trim().length === 0) {
    throw badRequest('lastName is required');
  }
  if (rulesAccepted !== true) {
    throw badRequest('rulesAccepted must be accepted');
  }

  const descriptionValue = optionalString(description);
  const reservationIdValue = optionalString(reservationId);

  const submission = await createSubmission(
    slug,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(descriptionValue !== undefined ? { description: descriptionValue } : {}),
      ...(reservationIdValue !== undefined ? { reservationId: reservationIdValue } : {}),
    },
    parseSubmissionPhotos(artworks, 'artworks'),
    request.signedCookies as Record<string, string | undefined>,
  );

  response.status(201).json(submission);
}
