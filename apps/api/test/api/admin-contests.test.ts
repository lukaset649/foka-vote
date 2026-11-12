import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AdminContestDto, ErrorResponseBody, PaginatedDto } from '@foka-vote/shared';
import type { Agent } from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { TEST_UPLOADS_DIR } from '../env.js';
import { createContest, createSubmission, createTopic, createVoteCard } from '../factories.js';
import { loginAsAdmin } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function contestPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Wiosna 2026',
    submissionStart: daysFromNow(1),
    submissionDeadline: daysFromNow(2),
    votingStart: daysFromNow(3),
    votingEnd: daysFromNow(4),
    ...overrides,
  };
}

let admin: Agent;

beforeEach(async () => {
  admin = await loginAsAdmin();
});

describe('POST /api/admin/contests', () => {
  it('creates a contest with defaults', async () => {
    const payload = contestPayload();

    const response = await admin.post('/api/admin/contests').send(payload).expect(201);

    expect(response.body).toEqual({
      id: expect.any(String) as unknown,
      slug: 'wiosna-2026',
      title: 'Wiosna 2026',
      description: null,
      submissionStart: payload.submissionStart,
      submissionDeadline: payload.submissionDeadline,
      votingStart: payload.votingStart,
      votingEnd: payload.votingEnd,
      maxArtworksPerSubmission: 3,
      status: 'DRAFT',
      hasAccessCode: false,
      accessCode: null,
      createdAt: expect.any(String) as unknown,
    });
    expect(await prisma.contest.count()).toBe(1);
  });

  it('stores the optional fields', async () => {
    const response = await admin
      .post('/api/admin/contests')
      .send(
        contestPayload({
          slug: 'custom-slug',
          description: 'Opis',
          maxArtworksPerSubmission: 15,
          accessCode: 'SECRET',
        }),
      )
      .expect(201);

    expect(response.body).toMatchObject({
      slug: 'custom-slug',
      description: 'Opis',
      maxArtworksPerSubmission: 15,
      hasAccessCode: true,
      accessCode: 'SECRET',
    });
  });

  it('computes the status from the dates', async () => {
    const response = await admin
      .post('/api/admin/contests')
      .send(contestPayload({ submissionStart: daysFromNow(-1) }))
      .expect(201);

    expect((response.body as AdminContestDto).status).toBe('SUBMISSIONS');
  });

  it('accepts a submission deadline equal to the voting start', async () => {
    const at = daysFromNow(2);

    await admin
      .post('/api/admin/contests')
      .send(contestPayload({ submissionDeadline: at, votingStart: at }))
      .expect(201);
  });

  it.each(['title', 'submissionStart', 'submissionDeadline', 'votingStart', 'votingEnd'])(
    'rejects a missing %s',
    async (field) => {
      const response = await admin
        .post('/api/admin/contests')
        .send(contestPayload({ [field]: undefined }))
        .expect(400);

      expect(errorCode(response)).toBe('VALIDATION_FAILED');
    },
  );

  it.each([
    ['an invalid date', { votingEnd: 'not-a-date' }],
    ['a start equal to the deadline', { submissionDeadline: daysFromNow(1) }],
    ['a deadline after the voting start', { submissionDeadline: daysFromNow(3.5) }],
    ['a voting start equal to the voting end', { votingEnd: daysFromNow(3) }],
    ['zero artworks', { maxArtworksPerSubmission: 0 }],
    ['too many artworks', { maxArtworksPerSubmission: 16 }],
    ['a fractional artwork limit', { maxArtworksPerSubmission: 2.5 }],
    ['an artwork limit as a string', { maxArtworksPerSubmission: '3' }],
    ['a non-string topicId', { topicId: 1 }],
    ['an empty title', { title: '' }],
    ['a blank title', { title: '   ' }],
    ['a non-string title', { title: 123 }],
    ['a slug that is not URL-safe', { slug: 'Hello World!' }],
    ['a non-string description', { description: 5 }],
    ['a non-string access code', { accessCode: 5 }],
  ])('rejects %s', async (_case, overrides) => {
    const response = await admin
      .post('/api/admin/contests')
      .send(contestPayload(overrides))
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect(await prisma.contest.count()).toBe(0);
  });

  it('treats an empty slug as missing and derives it from the title', async () => {
    const response = await admin
      .post('/api/admin/contests')
      .send(contestPayload({ slug: '' }))
      .expect(201);

    expect((response.body as AdminContestDto).slug).toBe('wiosna-2026');
  });

  it.each(['!!!', '🌸🌸🌸'])(
    'asks for a slug when none can be derived from the title %j',
    async (title) => {
      const response = await admin
        .post('/api/admin/contests')
        .send(contestPayload({ title }))
        .expect(400);
      const body = response.body as ErrorResponseBody;

      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.message).toMatch(/slug/i);
      expect(await prisma.contest.count()).toBe(0);
    },
  );

  it('accepts such a title with an explicit slug', async () => {
    const response = await admin
      .post('/api/admin/contests')
      .send(contestPayload({ title: '🌸🌸🌸', slug: 'kwiaty' }))
      .expect(201);

    expect(response.body).toMatchObject({ title: '🌸🌸🌸', slug: 'kwiaty' });
  });

  it('rejects a slug that is already in use', async () => {
    await createContest({ slug: 'wiosna-2026' });

    const response = await admin.post('/api/admin/contests').send(contestPayload()).expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
  });
});

describe('POST /api/admin/contests with a topic', () => {
  it('deletes the topic together with creating the contest', async () => {
    const topic = await createTopic('Wiosna 2026');
    const other = await createTopic('Lato');

    await admin
      .post('/api/admin/contests')
      .send(contestPayload({ topicId: topic.id }))
      .expect(201);

    expect(await prisma.contestTopic.findMany()).toEqual([other]);
  });

  it('still creates the contest when the topic no longer exists', async () => {
    await admin
      .post('/api/admin/contests')
      .send(contestPayload({ topicId: 'missing-topic' }))
      .expect(201);

    expect(await prisma.contest.count()).toBe(1);
  });

  it('keeps the topic when the contest is rejected', async () => {
    const topic = await createTopic();
    await createContest({ slug: 'wiosna-2026' });

    await admin
      .post('/api/admin/contests')
      .send(contestPayload({ topicId: topic.id }))
      .expect(409);

    expect(await prisma.contestTopic.count()).toBe(1);
  });
});

describe('GET /api/admin/contests', () => {
  it('lists contests in every phase, newest first, with access codes', async () => {
    const draft = await createContest({ phase: 'DRAFT', createdAt: new Date('2026-01-01') });
    const closed = await createContest({
      phase: 'CLOSED',
      accessCode: 'CODE',
      createdAt: new Date('2026-02-01'),
    });

    const response = await admin.get('/api/admin/contests').expect(200);
    const body = response.body as PaginatedDto<AdminContestDto>;

    expect(body).toMatchObject({ total: 2, page: 1, pageSize: 10 });
    expect(body.items.map((contest) => contest.id)).toEqual([closed.id, draft.id]);
    expect(body.items[0]).toMatchObject({ status: 'CLOSED', accessCode: 'CODE' });
    expect(body.items[1]).toMatchObject({ status: 'DRAFT', accessCode: null });
  });

  it('searches titles case-insensitively and paginates', async () => {
    await createContest({ title: 'Jesień w mieście' });
    await createContest({ title: 'Zimowa JESIEŃ' });
    await createContest({ title: 'Lato' });

    const response = await admin
      .get('/api/admin/contests')
      .query({ q: 'jesień', sort: 'title', pageSize: 1, page: 2 })
      .expect(200);
    const body = response.body as PaginatedDto<AdminContestDto>;

    expect(body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(body.items.map((contest) => contest.title)).toEqual(['Zimowa JESIEŃ']);
  });

  it('rejects an invalid list query', async () => {
    const response = await admin.get('/api/admin/contests').query({ sort: 'id' }).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/admin/contests/:id', () => {
  it('returns the contest', async () => {
    const contest = await createContest({ phase: 'VOTING', accessCode: 'CODE' });

    const response = await admin.get(`/api/admin/contests/${contest.id}`).expect(200);

    expect(response.body).toMatchObject({
      id: contest.id,
      slug: contest.slug,
      status: 'VOTING',
      accessCode: 'CODE',
    });
  });

  it('answers 404 for an unknown id', async () => {
    const response = await admin.get('/api/admin/contests/missing').expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/admin/contests/:id', () => {
  it('updates only the given fields', async () => {
    const contest = await createContest({ description: 'Old', accessCode: 'OLD' });

    const response = await admin
      .patch(`/api/admin/contests/${contest.id}`)
      .send({ title: 'New title', maxArtworksPerSubmission: 5 })
      .expect(200);

    expect(response.body).toMatchObject({
      slug: contest.slug,
      title: 'New title',
      description: 'Old',
      accessCode: 'OLD',
      maxArtworksPerSubmission: 5,
      submissionStart: contest.submissionStart.toISOString(),
    });
  });

  it('clears nullable fields with null', async () => {
    const contest = await createContest({ description: 'Old', accessCode: 'OLD' });

    const response = await admin
      .patch(`/api/admin/contests/${contest.id}`)
      .send({ description: null, accessCode: null })
      .expect(200);

    expect(response.body).toMatchObject({
      description: null,
      accessCode: null,
      hasAccessCode: false,
    });
  });

  it('changes the slug and moves the contest to another phase', async () => {
    const contest = await createContest({ phase: 'DRAFT' });

    const response = await admin
      .patch(`/api/admin/contests/${contest.id}`)
      .send({ slug: 'renamed', submissionStart: daysFromNow(-1) })
      .expect(200);

    expect(response.body).toMatchObject({ slug: 'renamed', status: 'SUBMISSIONS' });
  });

  it('keeps its own slug without a conflict', async () => {
    const contest = await createContest();

    await admin.patch(`/api/admin/contests/${contest.id}`).send({ slug: contest.slug }).expect(200);
  });

  it('treats an empty slug as missing and keeps the current one', async () => {
    const contest = await createContest();

    const response = await admin
      .patch(`/api/admin/contests/${contest.id}`)
      .send({ slug: '' })
      .expect(200);

    expect((response.body as AdminContestDto).slug).toBe(contest.slug);
  });

  it('rejects a slug used by another contest', async () => {
    const taken = await createContest();
    const contest = await createContest();

    const response = await admin
      .patch(`/api/admin/contests/${contest.id}`)
      .send({ slug: taken.slug })
      .expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
  });

  it.each([
    ['dates out of order combined with the stored ones', { votingEnd: daysFromNow(-10) }],
    ['an invalid date', { votingStart: 'not-a-date' }],
    ['an artwork limit out of range', { maxArtworksPerSubmission: 0 }],
    ['an empty title', { title: '' }],
    ['a non-string title', { title: 123 }],
    ['a slug that is not URL-safe', { slug: 'Hello World!' }],
    ['a non-string description', { description: 5 }],
    ['a non-string access code', { accessCode: 5 }],
    ['a body that is not an object', [1]],
  ])('rejects %s', async (_case, body) => {
    const contest = await createContest();

    const response = await admin.patch(`/api/admin/contests/${contest.id}`).send(body).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('answers 404 for an unknown id', async () => {
    await admin.patch('/api/admin/contests/missing').send({ title: 'x' }).expect(404);
  });
});

describe('DELETE /api/admin/contests/:id', () => {
  it('deletes the contest with its submissions, vote cards and files', async () => {
    const contest = await createContest({ phase: 'VOTING' });
    const submission = await createSubmission(contest.id);
    await createVoteCard(contest.id, [{ submissionId: submission.id, points: 3 }]);
    const artwork = await prisma.artwork.findFirstOrThrow();
    const storedFile = path.join(TEST_UPLOADS_DIR, artwork.filePath);
    await mkdir(path.dirname(storedFile), { recursive: true });
    await writeFile(storedFile, 'image');

    await admin.delete(`/api/admin/contests/${contest.id}`).expect(204);

    expect(await prisma.contest.count()).toBe(0);
    expect(await prisma.submission.count()).toBe(0);
    expect(await prisma.artwork.count()).toBe(0);
    expect(await prisma.voteCard.count()).toBe(0);
    expect(await prisma.voteItem.count()).toBe(0);
    await expect(stat(storedFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('leaves other contests untouched', async () => {
    const contest = await createContest();
    const other = await createContest();
    await createSubmission(other.id);

    await admin.delete(`/api/admin/contests/${contest.id}`).expect(204);

    expect(await prisma.contest.findMany({ select: { id: true } })).toEqual([{ id: other.id }]);
    expect(await prisma.submission.count()).toBe(1);
  });

  it('answers 404 for an unknown id', async () => {
    const response = await admin.delete('/api/admin/contests/missing').expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});
