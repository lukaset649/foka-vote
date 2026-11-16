import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { parseListQuery } from '../../lib/list-query.js';
import { parseRequiredText, requireObjectBody } from '../../lib/request-body.js';
import { requireParam } from '../../lib/request-params.js';
import {
  CONTEST_ACCESS_COOKIE_MAX_AGE_MS,
  contestAccessCookieName,
  getPublicContestBySlug,
  listPublicContests,
  verifyContestAccessCode,
} from './service.js';

export async function list(request: Request, response: Response): Promise<void> {
  const contests = await listPublicContests(parseListQuery(request.query));
  response.json(contests);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contest = await getPublicContestBySlug(requireParam(request, 'slug'));
  response.json(contest);
}

export async function verifyAccess(request: Request, response: Response): Promise<void> {
  const slug = requireParam(request, 'slug');
  const code = parseRequiredText(requireObjectBody(request.body).code, 'code');

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
