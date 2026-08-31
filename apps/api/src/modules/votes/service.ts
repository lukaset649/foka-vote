import type { VoteCardDto, VoteCardPayload } from '@foka-vote/shared';
import type { VoteCard, VoteItem } from '@prisma/client';
import { assertContestAccess } from '../contests/service.js';
import { badRequest, conflict, notFound } from '../../errors/app-error.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import { prisma } from '../../lib/prisma.js';
import { computeVoteSlots, expectedPoints } from '../../lib/vote-slots.js';

export const VOTE_CARD_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function voteCardCookieName(contestId: string): string {
  return `vote_card_${contestId}`;
}

function toVoteCardDto(card: VoteCard, items: VoteItem[]): VoteCardDto {
  return {
    id: card.id,
    isVoid: card.isVoid,
    voidReason: card.voidReason,
    createdAt: card.createdAt.toISOString(),
    items: items.map((item) => ({ submissionId: item.submissionId, points: item.points })),
  };
}

export async function getMyVoteCard(
  slug: string,
  signedCookies: Record<string, string | undefined>,
): Promise<VoteCardDto> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }

  assertContestAccess(contest, signedCookies);

  const cardId = signedCookies[voteCardCookieName(contest.id)];
  if (!cardId) {
    throw notFound('No vote card found');
  }

  const card = await prisma.voteCard.findUnique({
    where: { id: cardId },
    include: { items: true },
  });
  if (!card || card.contestId !== contest.id) {
    throw notFound('No vote card found');
  }

  return toVoteCardDto(card, card.items);
}

export async function createVoteCard(
  slug: string,
  payload: VoteCardPayload,
  signedCookies: Record<string, string | undefined>,
): Promise<{ dto: VoteCardDto; contestId: string }> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }

  const status = computeContestStatus(new Date(), contest);
  if (status !== 'VOTING') {
    throw conflict('This contest is not currently open for voting');
  }

  assertContestAccess(contest, signedCookies);

  const existingCardId = signedCookies[voteCardCookieName(contest.id)];
  if (existingCardId) {
    const existingCard = await prisma.voteCard.findUnique({ where: { id: existingCardId } });
    if (existingCard && existingCard.contestId === contest.id) {
      throw conflict('You have already voted in this contest');
    }
  }

  const total = await prisma.submission.count({ where: { contestId: contest.id } });
  const slots = computeVoteSlots(total);
  if (slots === 0) {
    throw conflict('Not enough submissions to vote on yet');
  }

  const { picks } = payload;
  if (picks.length !== slots) {
    throw badRequest(`Vote card must contain exactly ${slots} picks`);
  }

  const actualPoints = picks.map((pick) => pick.points).sort((a, b) => b - a);
  const wantedPoints = expectedPoints(slots);
  if (JSON.stringify(actualPoints) !== JSON.stringify(wantedPoints)) {
    throw badRequest(`Vote card points must be exactly ${JSON.stringify(wantedPoints)}`);
  }

  const pickedIds = picks.map((pick) => pick.submissionId);
  if (new Set(pickedIds).size !== pickedIds.length) {
    throw badRequest('Vote card cannot pick the same submission twice');
  }

  const validSubmissions = await prisma.submission.findMany({
    where: { id: { in: pickedIds }, contestId: contest.id },
    select: { id: true },
  });
  if (validSubmissions.length !== pickedIds.length) {
    throw badRequest('Vote card contains a submission that is not part of this contest');
  }

  const { card, items } = await prisma.$transaction(async (tx) => {
    const card = await tx.voteCard.create({ data: { contestId: contest.id } });

    const items: VoteItem[] = [];
    for (const pick of picks) {
      // eslint-disable-next-line no-await-in-loop -- vote items must be created within the same transaction
      const item = await tx.voteItem.create({
        data: { voteCardId: card.id, submissionId: pick.submissionId, points: pick.points },
      });
      items.push(item);
    }

    return { card, items };
  });

  return { dto: toVoteCardDto(card, items), contestId: contest.id };
}
