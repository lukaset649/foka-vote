import type { Request, Response } from 'express';
import { badRequest } from '../../../errors/app-error.js';
import { requireParam } from '../../../lib/request-params.js';
import { listVoteCards, unvoidVoteCard, voidVoteCard } from './service.js';

function parseVoidReason(body: unknown): string | undefined {
  const input = (body ?? {}) as Record<string, unknown>;
  if (input.reason === undefined) {
    return undefined;
  }
  if (typeof input.reason !== 'string') {
    throw badRequest('reason must be a string');
  }
  return input.reason;
}

export async function list(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const cards = await listVoteCards(contestId);
  response.json(cards);
}

export async function voidCard(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const cardId = requireParam(request, 'cardId');
  const reason = parseVoidReason(request.body);
  const card = await voidVoteCard(contestId, cardId, reason);
  response.json(card);
}

export async function unvoidCard(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const cardId = requireParam(request, 'cardId');
  const card = await unvoidVoteCard(contestId, cardId);
  response.json(card);
}
