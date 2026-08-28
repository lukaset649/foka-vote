import type { Request, Response } from 'express';
import { badRequest } from '../../../errors/app-error.js';
import { listVoteCards, unvoidVoteCard, voidVoteCard } from './service.js';

function requireContestIdParam(request: Request): string {
  const { contestId } = request.params;
  if (typeof contestId !== 'string' || contestId.length === 0) {
    throw badRequest('contestId is required');
  }
  return contestId;
}

function requireCardIdParam(request: Request): string {
  const { cardId } = request.params;
  if (typeof cardId !== 'string' || cardId.length === 0) {
    throw badRequest('cardId is required');
  }
  return cardId;
}

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
  const contestId = requireContestIdParam(request);
  const cards = await listVoteCards(contestId);
  response.json(cards);
}

export async function voidCard(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const cardId = requireCardIdParam(request);
  const reason = parseVoidReason(request.body);
  const card = await voidVoteCard(contestId, cardId, reason);
  response.json(card);
}

export async function unvoidCard(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const cardId = requireCardIdParam(request);
  const card = await unvoidVoteCard(contestId, cardId);
  response.json(card);
}
