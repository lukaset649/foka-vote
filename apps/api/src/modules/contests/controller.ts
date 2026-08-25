import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest } from '../../errors/app-error.js';
import {
  CONTEST_ACCESS_COOKIE_MAX_AGE_MS,
  contestAccessCookieName,
  getPublicContestBySlug,
  listPublicContests,
  verifyContestAccessCode,
} from './service.js';

function requireSlugParam(request: Request): string {
  const { slug } = request.params;
  if (typeof slug !== 'string' || slug.length === 0) {
    throw badRequest('slug is required');
  }
  return slug;
}

export async function list(_request: Request, response: Response): Promise<void> {
  const contests = await listPublicContests();
  response.json(contests);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contest = await getPublicContestBySlug(requireSlugParam(request));
  response.json(contest);
}

export async function verifyAccess(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const { code } = request.body as { code?: unknown };

  if (typeof code !== 'string' || code.length === 0) {
    throw badRequest('code is required');
  }

  const { contestId } = await verifyContestAccessCode(slug, code);

  response.cookie(contestAccessCookieName(contestId), code, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: CONTEST_ACCESS_COOKIE_MAX_AGE_MS,
  });
  response.status(204).end();
}
