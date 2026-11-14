import type { Request, Response } from 'express';
import { parseOptionalText } from '../../../lib/request-body.js';
import { requireParam } from '../../../lib/request-params.js';
import { listVoteCards, unvoidVoteCard, voidVoteCard } from './service.js';

function parseVoidReason(body: unknown): string | undefined {
  const { reason } = (body ?? {}) as Record<string, unknown>;
  return parseOptionalText(reason, 'reason') ?? undefined;
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
