import type { VoteCardDto } from '@foka-vote/shared';
import type { Agent } from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Contest, Submission, VoteCard } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import { createContest, createSubmission, createVoteCard } from '../factories.js';
import { loginAsAdmin } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';

let admin: Agent;
let contest: Contest;
let first: Submission;
let second: Submission;
let card: VoteCard;

function cardUrl(action: 'void' | 'unvoid', cardId = card.id, contestId = contest.id): string {
  return `/api/admin/contests/${contestId}/vote-cards/${cardId}/${action}`;
}

beforeEach(async () => {
  admin = await loginAsAdmin();
  contest = await createContest({ phase: 'VOTING' });
  first = await createSubmission(contest.id);
  second = await createSubmission(contest.id);
  card = await createVoteCard(contest.id, [
    { submissionId: first.id, points: 3 },
    { submissionId: second.id, points: 2 },
  ]);
});

describe('GET /api/admin/contests/:contestId/vote-cards', () => {
  it('lists cards oldest first with their picks', async () => {
    const later = await createVoteCard(contest.id, [{ submissionId: second.id, points: 3 }], {
      isVoid: true,
      voidReason: 'Duplicate',
    });
    await prisma.voteCard.update({
      where: { id: later.id },
      data: { createdAt: new Date(card.createdAt.getTime() + 1000) },
    });

    const response = await admin.get(`/api/admin/contests/${contest.id}/vote-cards`).expect(200);
    const body = response.body as VoteCardDto[];

    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({
      id: card.id,
      isVoid: false,
      voidReason: null,
      createdAt: card.createdAt.toISOString(),
      items: expect.arrayContaining([
        { submissionId: first.id, points: 3 },
        { submissionId: second.id, points: 2 },
      ]) as unknown,
    });
    expect(body[1]).toMatchObject({ id: later.id, isVoid: true, voidReason: 'Duplicate' });
  });

  it('does not include cards of other contests', async () => {
    const other = await createContest({ phase: 'VOTING' });
    const otherSubmission = await createSubmission(other.id);
    await createVoteCard(other.id, [{ submissionId: otherSubmission.id, points: 3 }]);

    const response = await admin.get(`/api/admin/contests/${contest.id}/vote-cards`).expect(200);

    expect((response.body as VoteCardDto[]).map((item) => item.id)).toEqual([card.id]);
  });

  it('answers 404 for an unknown contest', async () => {
    const response = await admin.get('/api/admin/contests/missing/vote-cards').expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('POST .../vote-cards/:cardId/void', () => {
  it('voids the card with a reason', async () => {
    const response = await admin.post(cardUrl('void')).send({ reason: 'Duplicate' }).expect(200);

    expect(response.body).toMatchObject({ id: card.id, isVoid: true, voidReason: 'Duplicate' });
    expect(await prisma.voteCard.findUniqueOrThrow({ where: { id: card.id } })).toMatchObject({
      isVoid: true,
      voidReason: 'Duplicate',
    });
  });

  it('voids the card without a reason', async () => {
    const response = await admin.post(cardUrl('void')).expect(200);

    expect(response.body).toMatchObject({ isVoid: true, voidReason: null });
  });

  it('trims the reason', async () => {
    const response = await admin.post(cardUrl('void')).send({ reason: ' Duplicate ' }).expect(200);

    expect((response.body as VoteCardDto).voidReason).toBe('Duplicate');
  });

  it.each(['', '   '])('stores a %j reason as null', async (reason) => {
    const response = await admin.post(cardUrl('void')).send({ reason }).expect(200);

    expect((response.body as VoteCardDto).voidReason).toBeNull();
  });

  it('replaces the reason of an already void card', async () => {
    await admin.post(cardUrl('void')).send({ reason: 'First' }).expect(200);

    const response = await admin.post(cardUrl('void')).send({ reason: 'Second' }).expect(200);

    expect((response.body as VoteCardDto).voidReason).toBe('Second');
  });

  it('rejects a non-string reason', async () => {
    const response = await admin.post(cardUrl('void')).send({ reason: 1 }).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect((await prisma.voteCard.findUniqueOrThrow({ where: { id: card.id } })).isVoid).toBe(
      false,
    );
  });

  it('answers 404 for a card of another contest', async () => {
    const other = await createContest();

    await admin.post(cardUrl('void', card.id, other.id)).expect(404);

    expect((await prisma.voteCard.findUniqueOrThrow({ where: { id: card.id } })).isVoid).toBe(
      false,
    );
  });

  it('answers 404 for an unknown card', async () => {
    await admin.post(cardUrl('void', 'missing')).expect(404);
  });
});

describe('POST .../vote-cards/:cardId/unvoid', () => {
  it('restores the card and clears the reason', async () => {
    await prisma.voteCard.update({
      where: { id: card.id },
      data: { isVoid: true, voidReason: 'Duplicate' },
    });

    const response = await admin.post(cardUrl('unvoid')).expect(200);

    expect(response.body).toMatchObject({ id: card.id, isVoid: false, voidReason: null });
  });

  it('leaves a valid card valid', async () => {
    const response = await admin.post(cardUrl('unvoid')).expect(200);

    expect((response.body as VoteCardDto).isVoid).toBe(false);
  });

  it('answers 404 for a card of another contest', async () => {
    const other = await createContest();

    await admin.post(cardUrl('unvoid', card.id, other.id)).expect(404);
  });
});
