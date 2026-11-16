import type { ContestDto, PendingUploadDto, PublicContestListDto } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { createContest } from '../factories.js';
import { agent, api } from '../helpers/app.js';
import { fixtureImage } from '../helpers/images.js';
import { errorCode } from '../helpers/responses.js';
import { storedFileExists } from '../helpers/storage.js';

function ids(contests: ContestDto[]): string[] {
  return contests.map((contest) => contest.id);
}

describe('GET /api/contests', () => {
  it('splits running contests from the others', async () => {
    const draft = await createContest({ phase: 'DRAFT', createdAt: new Date('2026-01-01') });
    const submissions = await createContest({
      phase: 'SUBMISSIONS',
      createdAt: new Date('2026-01-02'),
    });
    const voting = await createContest({ phase: 'VOTING', createdAt: new Date('2026-01-03') });
    const closed = await createContest({ phase: 'CLOSED', createdAt: new Date('2026-01-04') });

    const response = await api().get('/api/contests').expect(200);
    const body = response.body as PublicContestListDto;

    expect(ids(body.current)).toEqual([voting.id, submissions.id]);
    expect(ids(body.others.items)).toEqual([closed.id, draft.id]);
    expect(body.others).toMatchObject({ total: 2, page: 1, pageSize: 10 });
  });

  it('never exposes access codes', async () => {
    await createContest({ phase: 'SUBMISSIONS', accessCode: 'SECRET' });
    await createContest({ phase: 'CLOSED', accessCode: 'SECRET' });

    const response = await api().get('/api/contests').expect(200);
    const body = response.body as PublicContestListDto;

    for (const contest of [...body.current, ...body.others.items]) {
      expect(contest).not.toHaveProperty('accessCode');
      expect(contest.hasAccessCode).toBe(true);
    }
  });

  it('searches and paginates only the other contests', async () => {
    const running = await createContest({ phase: 'VOTING', title: 'Lato w mieście' });
    await createContest({ phase: 'CLOSED', title: 'Lato nad morzem' });
    await createContest({ phase: 'CLOSED', title: 'Lato w górach' });
    await createContest({ phase: 'CLOSED', title: 'Zima' });

    const response = await api()
      .get('/api/contests')
      .query({ q: 'lato', sort: 'title', pageSize: 1, page: 2 })
      .expect(200);
    const body = response.body as PublicContestListDto;

    expect(ids(body.current)).toEqual([running.id]);
    expect(body.others).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(body.others.items.map((contest) => contest.title)).toEqual(['Lato w górach']);
  });

  it('rejects an invalid list query', async () => {
    const response = await api().get('/api/contests').query({ pageSize: 0 }).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/contests/:slug', () => {
  it('returns the contest without its access code', async () => {
    const contest = await createContest({ phase: 'VOTING', accessCode: 'SECRET' });

    const response = await api().get(`/api/contests/${contest.slug}`).expect(200);

    expect(response.body).toMatchObject({
      id: contest.id,
      slug: contest.slug,
      status: 'VOTING',
      hasAccessCode: true,
    });
    expect(response.body).not.toHaveProperty('accessCode');
  });

  it('answers 404 for an unknown slug', async () => {
    const response = await api().get('/api/contests/missing').expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('POST /api/contests/:slug/access', () => {
  it('sets a signed, http-only access cookie for the right code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });

    const response = await api()
      .post(`/api/contests/${contest.slug}/access`)
      .send({ code: 'SECRET' })
      .expect(204);

    const cookie = (response.headers['set-cookie'] as unknown as string[] | undefined)?.find(
      (value) => value.startsWith(`contest_access_${contest.id}=s%3A`),
    );
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('rejects a wrong code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });

    const response = await api()
      .post(`/api/contests/${contest.slug}/access`)
      .send({ code: 'secret' })
      .expect(401);

    expect(errorCode(response)).toBe('UNAUTHORIZED');
  });

  it.each([
    ['a missing code', {}],
    ['an empty code', { code: '' }],
    ['a blank code', { code: '   ' }],
    ['a non-string code', { code: 1 }],
  ])('rejects %s', async (_case, body) => {
    const contest = await createContest({ accessCode: 'SECRET' });

    const response = await api()
      .post(`/api/contests/${contest.slug}/access`)
      .send(body)
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('rejects a code for a contest without one', async () => {
    const contest = await createContest();

    const response = await api()
      .post(`/api/contests/${contest.slug}/access`)
      .send({ code: 'SECRET' })
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('answers 404 for an unknown slug', async () => {
    await api().post('/api/contests/missing/access').send({ code: 'SECRET' }).expect(404);
  });
});

describe('POST /api/contests/:slug/uploads', () => {
  it('stores a pending upload with its files', async () => {
    const contest = await createContest({ phase: 'SUBMISSIONS' });

    const response = await api()
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(201);
    const body = response.body as PendingUploadDto;

    expect(body.thumbUrl).toMatch(/^\/media\/[\w-]+-thumb\.webp$/);
    const upload = await prisma.pendingUpload.findUniqueOrThrow({ where: { id: body.id } });
    expect(upload).toMatchObject({ contestId: contest.id, albumId: null, width: 1200 });
    for (const storedPath of [upload.filePath, upload.previewPath, upload.thumbPath]) {
      expect(await storedFileExists(storedPath)).toBe(true);
    }
  });

  it.each(['DRAFT', 'VOTING', 'CLOSED'] as const)(
    'rejects uploads in the %s phase',
    async (phase) => {
      const contest = await createContest({ phase });

      const response = await api()
        .post(`/api/contests/${contest.slug}/uploads`)
        .attach('photo', await fixtureImage(), 'photo.jpg')
        .expect(409);

      expect(errorCode(response)).toBe('CONFLICT');
      expect(await prisma.pendingUpload.count()).toBe(0);
    },
  );

  it('requires the access code cookie when the contest has a code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });

    const response = await api()
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(401);

    expect(errorCode(response)).toBe('UNAUTHORIZED');
  });

  it('accepts uploads after entering the access code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });
    const visitor = agent();
    await visitor.post(`/api/contests/${contest.slug}/access`).send({ code: 'SECRET' }).expect(204);

    await visitor
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(201);
  });

  it('accepts uploads after entering the access code with surrounding whitespace', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });
    const visitor = agent();
    await visitor
      .post(`/api/contests/${contest.slug}/access`)
      .send({ code: ' SECRET ' })
      .expect(204);

    await visitor
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(201);
  });

  it('stops accepting the old cookie once the access code changes', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });
    const visitor = agent();
    await visitor.post(`/api/contests/${contest.slug}/access`).send({ code: 'SECRET' }).expect(204);
    await prisma.contest.update({ where: { id: contest.id }, data: { accessCode: 'NEW' } });

    await visitor
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(401);
  });

  it('does not accept the access cookie of another contest', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });
    const other = await createContest({ accessCode: 'SECRET' });
    const visitor = agent();
    await visitor.post(`/api/contests/${other.slug}/access`).send({ code: 'SECRET' }).expect(204);

    await visitor
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(401);
  });

  it.each([
    ['no file', () => Promise.resolve(undefined)],
    ['an image below the minimum size', () => fixtureImage({ width: 200, height: 200 })],
    ['a file that is not an image', () => Promise.resolve(Buffer.from('not an image'))],
  ])('rejects %s', async (_case, file) => {
    const contest = await createContest();
    const request = api().post(`/api/contests/${contest.slug}/uploads`);
    const content = await file();

    const response = await (
      content ? request.attach('photo', content, 'photo.jpg') : request
    ).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect(await prisma.pendingUpload.count()).toBe(0);
  });

  it('rejects more than one file', async () => {
    const contest = await createContest();
    const image = await fixtureImage();

    await api()
      .post(`/api/contests/${contest.slug}/uploads`)
      .attach('photo', image, 'one.jpg')
      .attach('photo', image, 'two.jpg')
      .expect(400);
  });

  it('answers 404 for an unknown slug', async () => {
    await api()
      .post('/api/contests/missing/uploads')
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(404);
  });
});

describe('DELETE /api/contests/:slug/uploads/:uploadId', () => {
  async function upload(slug: string): Promise<PendingUploadDto> {
    const response = await api()
      .post(`/api/contests/${slug}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(201);
    return response.body as PendingUploadDto;
  }

  it('removes the upload and its files', async () => {
    const contest = await createContest();
    const { id } = await upload(contest.slug);
    const stored = await prisma.pendingUpload.findUniqueOrThrow({ where: { id } });

    await api().delete(`/api/contests/${contest.slug}/uploads/${id}`).expect(204);

    expect(await prisma.pendingUpload.count()).toBe(0);
    for (const storedPath of [stored.filePath, stored.previewPath, stored.thumbPath]) {
      expect(await storedFileExists(storedPath)).toBe(false);
    }
  });

  it('still works after the submission phase has ended', async () => {
    const contest = await createContest();
    const { id } = await upload(contest.slug);
    await prisma.contest.update({
      where: { id: contest.id },
      data: { votingStart: new Date(Date.now() - 1000) },
    });

    await api().delete(`/api/contests/${contest.slug}/uploads/${id}`).expect(204);

    expect(await prisma.pendingUpload.count()).toBe(0);
  });

  it('answers 204 for an unknown upload', async () => {
    const contest = await createContest();

    await api().delete(`/api/contests/${contest.slug}/uploads/missing`).expect(204);
  });

  it('does not remove an upload of another contest', async () => {
    const contest = await createContest();
    const other = await createContest();
    const { id } = await upload(other.slug);

    await api().delete(`/api/contests/${contest.slug}/uploads/${id}`).expect(204);

    expect(await prisma.pendingUpload.count()).toBe(1);
  });

  it('requires the access code cookie when the contest has a code', async () => {
    const contest = await createContest({ accessCode: 'SECRET' });

    await api().delete(`/api/contests/${contest.slug}/uploads/any`).expect(401);
  });
});
