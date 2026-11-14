import type { ResultsDto, VoteCardDto } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import type { Contest, Submission } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import { createContest, createSubmission, createVoteCard } from '../factories.js';
import { agent, api } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';

function votesUrl(contest: Contest): string {
  return `/api/contests/${contest.slug}/votes`;
}

function resultsUrl(contest: Contest): string {
  return `/api/contests/${contest.slug}/results`;
}

async function createSubmissions(contestId: string, count: number): Promise<Submission[]> {
  const submissions: Submission[] = [];
  for (let index = 0; index < count; index++) {
    // eslint-disable-next-line no-await-in-loop -- keeps creation order deterministic
    submissions.push(await createSubmission(contestId));
  }
  return submissions;
}

function picksFor(submissions: Submission[], points = [3, 2, 1]) {
  return points.map((value, index) => ({ submissionId: submissions[index]!.id, points: value }));
}

describe('POST /api/contests/:slug/votes', () => {
  it('stores the vote card and sets a signed vote cookie', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 4);

    const response = await api()
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);
    const card = response.body as VoteCardDto;

    expect(card).toMatchObject({ isVoid: false, voidReason: null });
    expect(card.items).toEqual(picksFor(submissions));
    expect(await prisma.voteItem.count({ where: { voteCardId: card.id } })).toBe(3);
    const cookie = (response.headers['set-cookie'] as unknown as string[] | undefined)?.find(
      (value) => value.startsWith(`vote_card_${contest.id}=s%3A`),
    );
    expect(cookie).toContain('HttpOnly');
  });

  it('accepts picks in any order', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 3);

    await api()
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions, [1, 3, 2]) })
      .expect(201);
  });

  it('needs fewer picks when there are fewer submissions than slots', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 2);

    await api()
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions, [3, 2]) })
      .expect(201);
  });

  it('rejects a second vote from the same browser', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 3);
    const voter = agent();
    await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);

    const response = await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
    expect(await prisma.voteCard.count()).toBe(1);
  });

  it('accepts a vote when the cookie points to a removed card', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 3);
    const voter = agent();
    const first = await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);
    await prisma.voteCard.delete({ where: { id: (first.body as VoteCardDto).id } });

    await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);
  });

  it('lets the same browser vote in another contest', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const other = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 3);
    const otherSubmissions = await createSubmissions(other.id, 3);
    const voter = agent();
    await voter
      .post(votesUrl(other))
      .send({ picks: picksFor(otherSubmissions) })
      .expect(201);

    await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);
  });

  it.each([
    ['a missing body', undefined],
    ['missing picks', {}],
    ['empty picks', { picks: [] }],
    ['picks that are not an array', { picks: 'abc' }],
    ['a pick that is not an object', { picks: ['abc'] }],
    ['a pick without a submission', { picks: [{ points: 3 }] }],
    ['a pick with fractional points', { picks: [{ submissionId: 'x', points: 2.5 }] }],
  ])('rejects %s', async (_case, body) => {
    const contest = await createContest({ phase: 'VOTING' });
    await createSubmissions(contest.id, 3);

    const request = api().post(votesUrl(contest));
    const response = await (body === undefined ? request : request.send(body)).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it.each([
    ['too few picks', [3, 2]],
    ['too many picks', [3, 2, 1, 1]],
    ['wrong points', [3, 3, 1]],
    ['points outside the weights', [4, 2, 1]],
  ])('rejects %s', async (_case, points) => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 4);

    const response = await api()
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions, points) })
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect(await prisma.voteCard.count()).toBe(0);
  });

  it('rejects the same submission picked twice', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const [first, second] = await createSubmissions(contest.id, 3);

    await api()
      .post(votesUrl(contest))
      .send({
        picks: [
          { submissionId: first!.id, points: 3 },
          { submissionId: first!.id, points: 2 },
          { submissionId: second!.id, points: 1 },
        ],
      })
      .expect(400);
  });

  it.each([
    ['an unknown submission', () => Promise.resolve('missing')],
    [
      'a submission of another contest',
      async () => (await createSubmission((await createContest({ phase: 'VOTING' })).id)).id,
    ],
  ])('rejects %s', async (_case, foreignId) => {
    const contest = await createContest({ phase: 'VOTING' });
    const [first, second] = await createSubmissions(contest.id, 3);

    await api()
      .post(votesUrl(contest))
      .send({
        picks: [
          { submissionId: first!.id, points: 3 },
          { submissionId: second!.id, points: 2 },
          { submissionId: await foreignId(), points: 1 },
        ],
      })
      .expect(400);

    expect(await prisma.voteCard.count()).toBe(0);
  });

  it('answers 409 when the contest has no submissions', async () => {
    const contest = await createContest({ phase: 'VOTING' });

    const response = await api()
      .post(votesUrl(contest))
      .send({ picks: [{ submissionId: 'x', points: 3 }] })
      .expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
  });

  it.each(['DRAFT', 'SUBMISSIONS', 'CLOSED'] as const)(
    'answers 409 in the %s phase',
    async (phase) => {
      const contest = await createContest({ phase });
      const submissions = await createSubmissions(contest.id, 3);

      await api()
        .post(votesUrl(contest))
        .send({ picks: picksFor(submissions) })
        .expect(409);
    },
  );

  it('requires the access code cookie when the contest has a code', async () => {
    const contest = await createContest({ phase: 'VOTING', accessCode: 'SECRET' });
    const submissions = await createSubmissions(contest.id, 3);
    const voter = agent();

    await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(401);
    await voter.post(`/api/contests/${contest.slug}/access`).send({ code: 'SECRET' }).expect(204);
    await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);
  });

  it('answers 404 for an unknown slug', async () => {
    await api()
      .post('/api/contests/missing/votes')
      .send({ picks: [{ submissionId: 'x', points: 3 }] })
      .expect(404);
  });
});

describe('GET /api/contests/:slug/votes/me', () => {
  it('returns the card of this browser', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 3);
    const voter = agent();
    const created = await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);

    const response = await voter.get(`${votesUrl(contest)}/me`).expect(200);

    expect(response.body).toEqual(created.body);
  });

  it('shows that the card was voided', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(contest.id, 3);
    const voter = agent();
    const created = await voter
      .post(votesUrl(contest))
      .send({ picks: picksFor(submissions) })
      .expect(201);
    await prisma.voteCard.update({
      where: { id: (created.body as VoteCardDto).id },
      data: { isVoid: true, voidReason: 'Duplicate' },
    });

    const response = await voter.get(`${votesUrl(contest)}/me`).expect(200);

    expect(response.body).toMatchObject({ isVoid: true, voidReason: 'Duplicate' });
  });

  it('answers 404 without a vote cookie', async () => {
    const contest = await createContest({ phase: 'VOTING' });

    const response = await api()
      .get(`${votesUrl(contest)}/me`)
      .expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });

  it('answers 404 in another contest', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const other = await createContest({ phase: 'VOTING' });
    const submissions = await createSubmissions(other.id, 3);
    const voter = agent();
    await voter
      .post(votesUrl(other))
      .send({ picks: picksFor(submissions) })
      .expect(201);

    await voter.get(`${votesUrl(contest)}/me`).expect(404);
  });

  it('requires the access code cookie when the contest has a code', async () => {
    const contest = await createContest({ phase: 'VOTING', accessCode: 'SECRET' });

    await api()
      .get(`${votesUrl(contest)}/me`)
      .expect(401);
  });

  it('answers 404 for an unknown slug', async () => {
    await api().get('/api/contests/missing/votes/me').expect(404);
  });
});

describe('GET /api/contests/:slug/results', () => {
  async function scoredContest(phase: 'VOTING' | 'CLOSED') {
    const contest = await createContest({ phase });
    const [anna, bartek, celina, darek] = await Promise.all([
      createSubmission(contest.id, { firstName: 'Anna', lastName: 'Zając', alias: 'Foka' }),
      createSubmission(contest.id, { firstName: 'Bartek', lastName: 'Adamski', alias: 'Mewa' }),
      createSubmission(contest.id, { firstName: 'Celina', lastName: 'Nowak', alias: 'Żuraw' }),
      createSubmission(contest.id, { firstName: 'Darek', lastName: 'Lis', alias: 'Kos' }),
    ]);
    await createVoteCard(contest.id, [
      { submissionId: anna.id, points: 3 },
      { submissionId: bartek.id, points: 2 },
      { submissionId: celina.id, points: 1 },
    ]);
    await createVoteCard(contest.id, [
      { submissionId: bartek.id, points: 3 },
      { submissionId: anna.id, points: 2 },
      { submissionId: darek.id, points: 1 },
    ]);
    await createVoteCard(
      contest.id,
      [
        { submissionId: darek.id, points: 3 },
        { submissionId: celina.id, points: 2 },
        { submissionId: anna.id, points: 1 },
      ],
      { isVoid: true, voidReason: 'Duplicate' },
    );
    return { contest, anna: anna, bartek: bartek, celina: celina, darek: darek };
  }

  it('sums points of valid cards and shares places on ties', async () => {
    const { contest, anna, bartek, celina, darek } = await scoredContest('CLOSED');

    const response = await api().get(resultsUrl(contest)).expect(200);
    const body = response.body as ResultsDto;

    expect(body).toMatchObject({ voteCardCount: 2, final: true });
    expect(body.results).toEqual([
      {
        submissionId: bartek.id,
        alias: 'Mewa',
        firstName: 'Bartek',
        lastName: 'Adamski',
        total: 5,
        place: 1,
        votes3: 1,
        votes2: 1,
        votes1: 0,
      },
      {
        submissionId: anna.id,
        alias: 'Foka',
        firstName: 'Anna',
        lastName: 'Zając',
        total: 5,
        place: 1,
        votes3: 1,
        votes2: 1,
        votes1: 0,
      },
      {
        submissionId: darek.id,
        alias: 'Kos',
        firstName: 'Darek',
        lastName: 'Lis',
        total: 1,
        place: 2,
        votes3: 0,
        votes2: 0,
        votes1: 1,
      },
      {
        submissionId: celina.id,
        alias: 'Żuraw',
        firstName: 'Celina',
        lastName: 'Nowak',
        total: 1,
        place: 2,
        votes3: 0,
        votes2: 0,
        votes1: 1,
      },
    ]);
  });

  it('hides names while voting is still open', async () => {
    const { contest } = await scoredContest('VOTING');

    const response = await api().get(resultsUrl(contest)).expect(200);
    const body = response.body as ResultsDto;

    expect(body.final).toBe(false);
    for (const entry of body.results) {
      expect(entry).not.toHaveProperty('firstName');
      expect(entry).not.toHaveProperty('lastName');
    }
  });

  it('returns no ranking until a valid card exists', async () => {
    const contest = await createContest({ phase: 'CLOSED' });
    const [submission] = await createSubmissions(contest.id, 1);
    await createVoteCard(contest.id, [{ submissionId: submission!.id, points: 3 }], {
      isVoid: true,
    });

    const response = await api().get(resultsUrl(contest)).expect(200);

    expect(response.body).toEqual({ results: [], voteCardCount: 0, final: true });
  });

  it.each(['DRAFT', 'SUBMISSIONS'] as const)('answers 409 in the %s phase', async (phase) => {
    const contest = await createContest({ phase });

    const response = await api().get(resultsUrl(contest)).expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
  });

  it('answers 404 for an unknown slug', async () => {
    await api().get('/api/contests/missing/results').expect(404);
  });
});
