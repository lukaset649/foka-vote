import type { VoteCardPayload, VoteCardPick } from '@foka-vote/shared';
import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest } from '../../errors/app-error.js';
import { requireParam } from '../../lib/request-params.js';
import {
  VOTE_CARD_COOKIE_MAX_AGE_MS,
  createVoteCard,
  getMyVoteCard,
  voteCardCookieName,
} from './service.js';

function parsePicks(raw: unknown): VoteCardPick[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw badRequest('picks must be a non-empty array');
  }

  return raw.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      throw badRequest('each pick must be an object');
    }
    const { submissionId, points } = entry as Record<string, unknown>;
    if (typeof submissionId !== 'string' || submissionId.length === 0) {
      throw badRequest('each pick requires a submissionId');
    }
    if (typeof points !== 'number' || !Number.isInteger(points)) {
      throw badRequest('each pick requires integer points');
    }
    return { submissionId, points };
  });
}

export async function getMine(request: Request, response: Response): Promise<void> {
  const slug = requireParam(request, 'slug');
  const card = await getMyVoteCard(
    slug,
    request.signedCookies as Record<string, string | undefined>,
  );
  response.json(card);
}

export async function create(request: Request, response: Response): Promise<void> {
  const slug = requireParam(request, 'slug');
  const { picks } = request.body as { picks?: unknown };
  const payload: VoteCardPayload = { picks: parsePicks(picks) };

  const { dto, contestId } = await createVoteCard(
    slug,
    payload,
    request.signedCookies as Record<string, string | undefined>,
  );

  response.cookie(voteCardCookieName(contestId), dto.id, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: VOTE_CARD_COOKIE_MAX_AGE_MS,
  });
  response.status(201).json(dto);
}
