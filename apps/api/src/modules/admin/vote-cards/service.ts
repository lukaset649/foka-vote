import type { VoteCardDto } from '@foka-vote/shared';
import type { VoteCard, VoteItem } from '@prisma/client';
import { notFound } from '../../../errors/app-error.js';
import { prisma } from '../../../lib/prisma.js';

function toVoteCardDto(card: VoteCard, items: VoteItem[]): VoteCardDto {
  return {
    id: card.id,
    isVoid: card.isVoid,
    voidReason: card.voidReason,
    createdAt: card.createdAt.toISOString(),
    items: items.map((item) => ({ submissionId: item.submissionId, points: item.points })),
  };
}

async function requireContest(contestId: string): Promise<void> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) {
    throw notFound('Contest not found');
  }
}

async function loadVoteCard(contestId: string, cardId: string): Promise<VoteCard> {
  const card = await prisma.voteCard.findUnique({ where: { id: cardId } });
  if (!card || card.contestId !== contestId) {
    throw notFound('Vote card not found');
  }
  return card;
}

export async function listVoteCards(contestId: string): Promise<VoteCardDto[]> {
  await requireContest(contestId);

  const cards = await prisma.voteCard.findMany({
    where: { contestId },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  return cards.map((card) => toVoteCardDto(card, card.items));
}

export async function voidVoteCard(
  contestId: string,
  cardId: string,
  reason?: string,
): Promise<VoteCardDto> {
  const existing = await loadVoteCard(contestId, cardId);
  const card = await prisma.voteCard.update({
    where: { id: existing.id },
    data: { isVoid: true, voidReason: reason ?? null },
    include: { items: true },
  });
  return toVoteCardDto(card, card.items);
}

export async function unvoidVoteCard(contestId: string, cardId: string): Promise<VoteCardDto> {
  const existing = await loadVoteCard(contestId, cardId);
  const card = await prisma.voteCard.update({
    where: { id: existing.id },
    data: { isVoid: false, voidReason: null },
    include: { items: true },
  });
  return toVoteCardDto(card, card.items);
}
