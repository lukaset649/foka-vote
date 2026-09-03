import type { Request, Response } from 'express';
import { badRequest } from '../../errors/app-error.js';
import type { ArtworkMetaInput } from './service.js';
import { createSubmission, listSubmissions, reserveAlias } from './service.js';

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

function parseArtworkMeta(raw: unknown): ArtworkMetaInput[] {
  if (typeof raw !== 'string') {
    throw badRequest('meta is required');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw badRequest('meta must be valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw badRequest('meta must be an array');
  }

  return parsed.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      throw badRequest('meta entries must be objects');
    }
    const { title, description } = entry as Record<string, unknown>;
    const titleValue = optionalString(title);
    const descriptionValue = optionalString(description);
    return {
      ...(titleValue !== undefined ? { title: titleValue } : {}),
      ...(descriptionValue !== undefined ? { description: descriptionValue } : {}),
    };
  });
}

export async function list(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const submissions = await listSubmissions(
    slug,
    request.signedCookies as Record<string, string | undefined>,
  );
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

export async function create(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const { firstName, lastName, description, meta, reservationId } = request.body as Record<
    string,
    unknown
  >;

  if (typeof firstName !== 'string' || firstName.length === 0) {
    throw badRequest('firstName is required');
  }
  if (typeof lastName !== 'string' || lastName.length === 0) {
    throw badRequest('lastName is required');
  }

  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  const artworksMeta = parseArtworkMeta(meta);
  const descriptionValue = optionalString(description);
  const reservationIdValue = optionalString(reservationId);

  const submission = await createSubmission(
    slug,
    {
      firstName,
      lastName,
      ...(descriptionValue !== undefined ? { description: descriptionValue } : {}),
      ...(reservationIdValue !== undefined ? { reservationId: reservationIdValue } : {}),
    },
    files,
    artworksMeta,
    request.signedCookies as Record<string, string | undefined>,
  );

  response.status(201).json(submission);
}
