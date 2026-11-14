import { NICKNAME_POOL, type AliasReservationDto, type SubmissionDto } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import type { Contest } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import { createContest, createPendingUpload, createSubmission } from '../factories.js';
import { agent, api } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function reserveUrl(contest: Contest): string {
  return `/api/contests/${contest.slug}/submissions/alias-reservations`;
}

function submissionsUrl(contest: Contest): string {
  return `/api/contests/${contest.slug}/submissions`;
}

async function fillAliasPool(contestId: string, leaveFree = 0): Promise<void> {
  await prisma.submission.createMany({
    data: NICKNAME_POOL.slice(leaveFree).map((alias, index) => ({
      contestId,
      alias,
      firstName: 'Jan',
      lastName: `Kowalski ${index}`,
      rulesAcceptedAt: new Date(),
    })),
  });
}

describe('POST /api/contests/:slug/submissions/alias-reservations', () => {
  it('reserves a nickname from the pool for 20 minutes', async () => {
    const contest = await createContest();
    const before = Date.now();

    const response = await api().post(reserveUrl(contest)).expect(201);
    const body = response.body as AliasReservationDto;

    expect(NICKNAME_POOL).toContain(body.alias);
    const ttl = new Date(body.expiresAt).getTime() - before;
    expect(ttl).toBeGreaterThan(19 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(21 * 60 * 1000);
    expect(await prisma.aliasReservation.count()).toBe(1);
  });

  it('skips nicknames used by submissions and active reservations', async () => {
    const contest = await createContest();
    await fillAliasPool(contest.id, 2);
    await prisma.aliasReservation.create({
      data: {
        contestId: contest.id,
        alias: NICKNAME_POOL[0]!,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await api().post(reserveUrl(contest)).expect(201);

    expect((response.body as AliasReservationDto).alias).toBe(NICKNAME_POOL[1]);
  });

  it('reuses nicknames of expired reservations and removes them', async () => {
    const contest = await createContest();
    await fillAliasPool(contest.id, 1);
    await prisma.aliasReservation.create({
      data: {
        contestId: contest.id,
        alias: NICKNAME_POOL[0]!,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await api().post(reserveUrl(contest)).expect(201);

    expect((response.body as AliasReservationDto).alias).toBe(NICKNAME_POOL[0]);
    expect(await prisma.aliasReservation.count()).toBe(1);
  });

  it('ignores nicknames used in other contests', async () => {
    const contest = await createContest();
    const other = await createContest();
    await fillAliasPool(other.id);

    await api().post(reserveUrl(contest)).expect(201);
  });

  it('answers 409 when the nickname pool is exhausted', async () => {
    const contest = await createContest();
    await fillAliasPool(contest.id);

    const response = await api().post(reserveUrl(contest)).expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
  });

  it.each(['DRAFT', 'VOTING', 'CLOSED'] as const)('answers 409 in the %s phase', async (phase) => {
    const contest = await createContest({ phase });

    await api().post(reserveUrl(contest)).expect(409);
  });

  it('requires the access code cookie when the contest has a code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });
    const visitor = agent();

    await visitor.post(reserveUrl(contest)).expect(401);
    await visitor.post(`/api/contests/${contest.slug}/access`).send({ code: 'SECRET' }).expect(204);
    await visitor.post(reserveUrl(contest)).expect(201);
  });

  it('answers 404 for an unknown slug', async () => {
    await api().post('/api/contests/missing/submissions/alias-reservations').expect(404);
  });
});

describe('POST /api/contests/:slug/submissions', () => {
  async function payload(
    contest: Contest,
    overrides: Record<string, unknown> = {},
    uploadCount = 2,
  ): Promise<Record<string, unknown>> {
    const uploads = await Promise.all(
      Array.from({ length: uploadCount }, () => createPendingUpload({ contestId: contest.id })),
    );
    return {
      firstName: 'Anna',
      lastName: 'Nowak',
      rulesAccepted: true,
      artworks: uploads.map((upload, index) => ({
        uploadId: upload.id,
        title: `Photo ${index + 1}`,
      })),
      ...overrides,
    };
  }

  it('creates the submission from pending uploads in the given order', async () => {
    const contest = await createContest();
    const body = await payload(contest, { description: 'Opis' });
    const artworks = body.artworks as { uploadId: string }[];
    body.artworks = [...artworks].reverse();
    const uploads = await prisma.pendingUpload.findMany();

    const response = await api().post(submissionsUrl(contest)).send(body).expect(201);
    const submission = response.body as SubmissionDto;

    expect(submission).toMatchObject({ description: 'Opis' });
    expect(submission).not.toHaveProperty('firstName');
    expect(submission).not.toHaveProperty('lastName');
    expect(NICKNAME_POOL).toContain(submission.alias);
    expect(submission.artworks.map((artwork) => artwork.title)).toEqual(['Photo 2', 'Photo 1']);

    const stored = await prisma.submission.findUniqueOrThrow({
      where: { id: submission.id },
      include: { artworks: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(stored).toMatchObject({ firstName: 'Anna', lastName: 'Nowak', contestId: contest.id });
    expect(stored.rulesAcceptedAt).toBeInstanceOf(Date);
    const uploadById = new Map(uploads.map((upload) => [upload.id, upload]));
    expect(stored.artworks.map((artwork) => artwork.filePath)).toEqual(
      [...artworks].reverse().map(({ uploadId }) => uploadById.get(uploadId)!.filePath),
    );
    expect(await prisma.pendingUpload.count()).toBe(0);
  });

  it('trims the names', async () => {
    const contest = await createContest();

    const response = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { firstName: ' Anna ', lastName: ' Nowak ' }))
      .expect(201);

    const stored = await prisma.submission.findUniqueOrThrow({
      where: { id: (response.body as SubmissionDto).id },
    });
    expect(stored).toMatchObject({ firstName: 'Anna', lastName: 'Nowak' });
  });

  it('trims the description and stores a blank one as null', async () => {
    const contest = await createContest();

    const trimmed = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { description: ' Opis ' }))
      .expect(201);
    const blank = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { description: '   ' }))
      .expect(201);

    expect((trimmed.body as SubmissionDto).description).toBe('Opis');
    expect((blank.body as SubmissionDto).description).toBeNull();
  });

  it('trims artwork captions and stores blank ones as null', async () => {
    const contest = await createContest();
    const upload = await createPendingUpload({ contestId: contest.id });

    const response = await api()
      .post(submissionsUrl(contest))
      .send(
        await payload(
          contest,
          { artworks: [{ uploadId: upload.id, title: ' Zachód ', description: '   ' }] },
          0,
        ),
      )
      .expect(201);

    expect((response.body as SubmissionDto).artworks[0]).toMatchObject({
      title: 'Zachód',
      description: null,
    });
  });

  it('uses the reserved nickname and releases the reservation', async () => {
    const contest = await createContest();
    const reservation = (await api().post(reserveUrl(contest)).expect(201))
      .body as AliasReservationDto;

    const response = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { reservationId: reservation.reservationId }))
      .expect(201);

    expect((response.body as SubmissionDto).alias).toBe(reservation.alias);
    expect(await prisma.aliasReservation.count()).toBe(0);
  });

  it('picks another nickname for an expired or foreign reservation', async () => {
    const contest = await createContest();
    const other = await createContest();
    const foreign = await prisma.aliasReservation.create({
      data: {
        contestId: other.id,
        alias: NICKNAME_POOL[0]!,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const expired = await prisma.aliasReservation.create({
      data: {
        contestId: contest.id,
        alias: NICKNAME_POOL[1]!,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const first = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { reservationId: foreign.id }))
      .expect(201);
    const second = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { reservationId: expired.id }))
      .expect(201);

    expect(NICKNAME_POOL).toContain((first.body as SubmissionDto).alias);
    expect(NICKNAME_POOL).toContain((second.body as SubmissionDto).alias);
    expect(await prisma.aliasReservation.count({ where: { id: foreign.id } })).toBe(1);
  });

  it('accepts exactly the maximum number of artworks', async () => {
    const contest = await createContest({ maxArtworksPerSubmission: 2 });

    await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, {}, 2))
      .expect(201);
  });

  it.each([
    ['a missing first name', { firstName: undefined }],
    ['a blank first name', { firstName: '   ' }],
    ['a blank last name', { lastName: '   ' }],
    ['rules that are not accepted', { rulesAccepted: false }],
    ['rules accepted as a string', { rulesAccepted: 'true' }],
    ['artworks that are not an array', { artworks: 'abc' }],
    ['no artworks', { artworks: [] }],
  ])('rejects %s', async (_case, overrides) => {
    const contest = await createContest();

    const response = await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, overrides))
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect(await prisma.submission.count()).toBe(0);
  });

  it('rejects more artworks than the contest allows', async () => {
    const contest = await createContest({ maxArtworksPerSubmission: 2 });

    await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, {}, 3))
      .expect(400);
  });

  it('rejects an upload used twice and keeps the uploads', async () => {
    const contest = await createContest();
    const upload = await createPendingUpload({ contestId: contest.id });

    await api()
      .post(submissionsUrl(contest))
      .send(
        await payload(contest, { artworks: [{ uploadId: upload.id }, { uploadId: upload.id }] }, 0),
      )
      .expect(400);

    expect(await prisma.pendingUpload.count()).toBe(1);
  });

  it.each([
    ['an unknown upload', () => Promise.resolve('missing')],
    [
      'an upload of another contest',
      async () => (await createPendingUpload({ contestId: (await createContest()).id })).id,
    ],
  ])('rejects %s and keeps the valid uploads', async (_case, uploadId) => {
    const contest = await createContest();
    const valid = await createPendingUpload({ contestId: contest.id });

    await api()
      .post(submissionsUrl(contest))
      .send(
        await payload(
          contest,
          { artworks: [{ uploadId: valid.id }, { uploadId: await uploadId() }] },
          0,
        ),
      )
      .expect(400);

    expect(await prisma.pendingUpload.count({ where: { id: valid.id } })).toBe(1);
    expect(await prisma.submission.count()).toBe(0);
  });

  it('rejects an expired upload', async () => {
    const contest = await createContest();
    const expired = await createPendingUpload(
      { contestId: contest.id },
      { createdAt: new Date(Date.now() - 2 * DAY_MS) },
    );

    await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest, { artworks: [{ uploadId: expired.id }] }, 0))
      .expect(400);
  });

  it('answers 409 when the nickname pool is exhausted', async () => {
    const contest = await createContest();
    await fillAliasPool(contest.id);

    await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest))
      .expect(409);
  });

  it.each(['DRAFT', 'VOTING', 'CLOSED'] as const)('answers 409 in the %s phase', async (phase) => {
    const contest = await createContest({ phase });

    await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest))
      .expect(409);
  });

  it('requires the access code cookie when the contest has a code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });

    await api()
      .post(submissionsUrl(contest))
      .send(await payload(contest))
      .expect(401);
  });

  it('answers 404 for an unknown slug', async () => {
    await api()
      .post('/api/contests/missing/submissions')
      .send({
        firstName: 'Anna',
        lastName: 'Nowak',
        rulesAccepted: true,
        artworks: [{ uploadId: 'any' }],
      })
      .expect(404);
  });
});

describe('GET /api/contests/:slug/submissions', () => {
  it.each(['DRAFT', 'SUBMISSIONS'] as const)('is hidden in the %s phase', async (phase) => {
    const contest = await createContest({ phase });
    await createSubmission(contest.id);

    const response = await api().get(submissionsUrl(contest)).expect(403);

    expect(errorCode(response)).toBe('FORBIDDEN');
  });

  it('lists submissions without names during voting', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const first = await createSubmission(contest.id, { artworkCount: 2 });
    const second = await createSubmission(contest.id);
    await prisma.submission.update({
      where: { id: second.id },
      data: { createdAt: new Date(first.createdAt.getTime() + 1000) },
    });

    const response = await api().get(submissionsUrl(contest)).expect(200);
    const body = response.body as SubmissionDto[];

    expect(body.map((submission) => submission.id)).toEqual([first.id, second.id]);
    expect(body[0]).not.toHaveProperty('firstName');
    expect(body[0]).not.toHaveProperty('lastName');
    expect(body[0]!.artworks.map((artwork) => artwork.sortOrder)).toEqual([0, 1]);
  });

  it('reveals names once the contest is closed', async () => {
    const contest = await createContest({ phase: 'CLOSED' });
    await createSubmission(contest.id, { firstName: 'Jan', lastName: 'Kowalski' });

    const response = await api().get(submissionsUrl(contest)).expect(200);

    expect((response.body as SubmissionDto[])[0]).toMatchObject({
      firstName: 'Jan',
      lastName: 'Kowalski',
    });
  });

  it('answers 404 for an unknown slug', async () => {
    await api().get('/api/contests/missing/submissions').expect(404);
  });
});
