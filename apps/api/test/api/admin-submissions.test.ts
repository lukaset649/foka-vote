import type { AdminSubmissionDto } from '@foka-vote/shared';
import type { Agent } from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Artwork, Contest, Submission } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import { createContest, createSubmission, createVoteCard } from '../factories.js';
import { loginAsAdmin } from '../helpers/app.js';
import { fixtureImage } from '../helpers/images.js';
import { errorCode } from '../helpers/responses.js';
import { storedFileExists, writeStoredFiles } from '../helpers/storage.js';

let admin: Agent;
let contest: Contest;
let submission: Submission;
let artworks: Artwork[];

function submissionUrl(path = ''): string {
  return `/api/admin/contests/${contest.id}/submissions/${submission.id}${path}`;
}

function artworkPaths(artwork: Artwork): string[] {
  return [artwork.filePath, artwork.previewPath, artwork.thumbPath];
}

beforeEach(async () => {
  admin = await loginAsAdmin();
  contest = await createContest({ phase: 'VOTING' });
  submission = await createSubmission(contest.id, {
    firstName: 'Jan',
    lastName: 'Kowalski',
    alias: 'Zebra',
    description: 'Opis',
    artworkCount: 3,
  });
  artworks = await prisma.artwork.findMany({
    where: { submissionId: submission.id },
    orderBy: { sortOrder: 'asc' },
  });
});

describe('GET /api/admin/contests/:contestId/submissions', () => {
  it('lists submissions oldest first with personal data and sorted artworks', async () => {
    const later = await createSubmission(contest.id);
    await prisma.submission.update({
      where: { id: later.id },
      data: { createdAt: new Date(submission.createdAt.getTime() + 1000) },
    });
    await prisma.artwork.update({ where: { id: artworks[0]!.id }, data: { sortOrder: 5 } });

    const response = await admin.get(`/api/admin/contests/${contest.id}/submissions`).expect(200);
    const body = response.body as AdminSubmissionDto[];

    expect(body.map((item) => item.id)).toEqual([submission.id, later.id]);
    expect(body[0]).toMatchObject({
      alias: 'Zebra',
      firstName: 'Jan',
      lastName: 'Kowalski',
      description: 'Opis',
    });
    expect(body[0]!.artworks.map((artwork) => artwork.id)).toEqual([
      artworks[1]!.id,
      artworks[2]!.id,
      artworks[0]!.id,
    ]);
    expect(body[0]!.artworks[0]).toEqual({
      id: artworks[1]!.id,
      title: artworks[1]!.title,
      description: null,
      fullUrl: `/media/${artworks[1]!.filePath.split('/')[1]!}`,
      previewUrl: `/media/${artworks[1]!.previewPath.split('/')[1]!}`,
      thumbUrl: `/media/${artworks[1]!.thumbPath.split('/')[1]!}`,
      width: 64,
      height: 48,
      sortOrder: 1,
    });
  });

  it('lists submissions in every phase', async () => {
    const draft = await createContest({ phase: 'DRAFT' });
    await createSubmission(draft.id);

    const response = await admin.get(`/api/admin/contests/${draft.id}/submissions`).expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('answers 404 for an unknown contest', async () => {
    const response = await admin.get('/api/admin/contests/missing/submissions').expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('GET /api/admin/contests/:contestId/submissions/:submissionId', () => {
  it('returns the submission', async () => {
    const response = await admin.get(submissionUrl()).expect(200);

    expect(response.body).toMatchObject({ id: submission.id, firstName: 'Jan' });
  });

  it('answers 404 for a submission of another contest', async () => {
    const other = await createContest();

    await admin.get(`/api/admin/contests/${other.id}/submissions/${submission.id}`).expect(404);
  });

  it('answers 404 for an unknown submission', async () => {
    await admin.get(`/api/admin/contests/${contest.id}/submissions/missing`).expect(404);
  });
});

describe('PATCH /api/admin/contests/:contestId/submissions/:submissionId', () => {
  it('updates only the given fields', async () => {
    const response = await admin.patch(submissionUrl()).send({ lastName: 'Nowak' }).expect(200);

    expect(response.body).toMatchObject({
      firstName: 'Jan',
      lastName: 'Nowak',
      description: 'Opis',
      alias: 'Zebra',
    });
    expect((response.body as AdminSubmissionDto).artworks).toHaveLength(3);
  });

  it('trims names and description', async () => {
    const response = await admin
      .patch(submissionUrl())
      .send({ firstName: ' Anna ', lastName: ' Nowak ', description: ' Nowy opis ' })
      .expect(200);

    expect(response.body).toMatchObject({
      firstName: 'Anna',
      lastName: 'Nowak',
      description: 'Nowy opis',
    });
  });

  it.each(['', '   '])('clears the description with %j', async (description) => {
    const response = await admin.patch(submissionUrl()).send({ description }).expect(200);

    expect((response.body as AdminSubmissionDto).description).toBeNull();
  });

  it.each([
    ['an empty first name', { firstName: '' }],
    ['a blank first name', { firstName: '   ' }],
    ['a non-string first name', { firstName: 1 }],
    ['an empty last name', { lastName: '' }],
    ['a blank last name', { lastName: '   ' }],
    ['a non-string description', { description: 1 }],
    ['a body that is not an object', [1]],
  ])('rejects %s', async (_case, body) => {
    const response = await admin.patch(submissionUrl()).send(body).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('answers 404 for a submission of another contest', async () => {
    const other = await createContest();

    await admin
      .patch(`/api/admin/contests/${other.id}/submissions/${submission.id}`)
      .send({ firstName: 'X' })
      .expect(404);
  });
});

describe('DELETE /api/admin/contests/:contestId/submissions/:submissionId', () => {
  it('deletes the submission with its artworks, votes and files', async () => {
    const other = await createSubmission(contest.id);
    await createVoteCard(contest.id, [
      { submissionId: submission.id, points: 3 },
      { submissionId: other.id, points: 2 },
    ]);
    const paths = artworks.flatMap(artworkPaths);
    await writeStoredFiles(paths);

    await admin.delete(submissionUrl()).expect(204);

    expect(await prisma.submission.findMany({ select: { id: true } })).toEqual([{ id: other.id }]);
    expect(await prisma.artwork.count({ where: { submissionId: submission.id } })).toBe(0);
    expect(await prisma.voteItem.findMany({ select: { submissionId: true } })).toEqual([
      { submissionId: other.id },
    ]);
    expect(await prisma.voteCard.count()).toBe(1);
    for (const storedPath of paths) {
      expect(await storedFileExists(storedPath)).toBe(false);
    }
  });

  it('answers 404 for a submission of another contest', async () => {
    const other = await createContest();

    await admin.delete(`/api/admin/contests/${other.id}/submissions/${submission.id}`).expect(404);

    expect(await prisma.submission.count()).toBe(1);
  });
});

describe('PATCH .../artworks/:artworkId', () => {
  it('updates the title and description', async () => {
    const response = await admin
      .patch(submissionUrl(`/artworks/${artworks[0]!.id}`))
      .send({ title: ' Zachód ', description: ' Opis pracy ' })
      .expect(200);

    expect((response.body as AdminSubmissionDto).artworks[0]).toMatchObject({
      id: artworks[0]!.id,
      title: 'Zachód',
      description: 'Opis pracy',
    });
  });

  it.each(['', '   '])('clears the title with %j', async (title) => {
    const response = await admin
      .patch(submissionUrl(`/artworks/${artworks[0]!.id}`))
      .send({ title })
      .expect(200);

    expect((response.body as AdminSubmissionDto).artworks[0]!.title).toBeNull();
  });

  it.each([
    ['a non-string title', { title: 1 }],
    ['a non-string description', { description: 1 }],
    ['a body that is not an object', [1]],
  ])('rejects %s', async (_case, body) => {
    const response = await admin
      .patch(submissionUrl(`/artworks/${artworks[0]!.id}`))
      .send(body)
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('answers 404 for an artwork of another submission', async () => {
    const other = await createSubmission(contest.id);
    const otherArtwork = await prisma.artwork.findFirstOrThrow({
      where: { submissionId: other.id },
    });

    await admin
      .patch(submissionUrl(`/artworks/${otherArtwork.id}`))
      .send({ title: 'X' })
      .expect(404);
  });
});

describe('DELETE .../artworks/:artworkId', () => {
  it('deletes the artwork and its files', async () => {
    const paths = artworkPaths(artworks[1]!);
    await writeStoredFiles(paths);

    const response = await admin.delete(submissionUrl(`/artworks/${artworks[1]!.id}`)).expect(200);

    expect((response.body as AdminSubmissionDto).artworks.map((artwork) => artwork.id)).toEqual([
      artworks[0]!.id,
      artworks[2]!.id,
    ]);
    for (const storedPath of paths) {
      expect(await storedFileExists(storedPath)).toBe(false);
    }
  });

  it('refuses to delete the last artwork', async () => {
    const single = await createSubmission(contest.id, { artworkCount: 1 });
    const artwork = await prisma.artwork.findFirstOrThrow({ where: { submissionId: single.id } });

    const response = await admin
      .delete(`/api/admin/contests/${contest.id}/submissions/${single.id}/artworks/${artwork.id}`)
      .expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
    expect(await prisma.artwork.count({ where: { submissionId: single.id } })).toBe(1);
  });

  it('answers 404 for an unknown artwork', async () => {
    await admin.delete(submissionUrl('/artworks/missing')).expect(404);
  });
});

describe('PATCH .../artworks/order', () => {
  it('reorders the artworks', async () => {
    const order = [artworks[2]!.id, artworks[0]!.id, artworks[1]!.id];

    const response = await admin
      .patch(submissionUrl('/artworks/order'))
      .send({ order })
      .expect(200);

    expect((response.body as AdminSubmissionDto).artworks.map((artwork) => artwork.id)).toEqual(
      order,
    );
    const stored = await prisma.artwork.findMany({
      where: { submissionId: submission.id },
      orderBy: { sortOrder: 'asc' },
    });
    expect(stored.map((artwork) => [artwork.id, artwork.sortOrder])).toEqual([
      [order[0], 0],
      [order[1], 1],
      [order[2], 2],
    ]);
  });

  it.each([
    ['a missing order', () => ({})],
    ['an empty order', () => ({ order: [] })],
    ['a non-array order', () => ({ order: 'abc' })],
    ['a missing artwork', () => ({ order: [artworks[0]!.id, artworks[1]!.id] })],
    [
      'a duplicated artwork',
      () => ({ order: [artworks[0]!.id, artworks[0]!.id, artworks[1]!.id] }),
    ],
    ['an unknown artwork', () => ({ order: [artworks[0]!.id, artworks[1]!.id, 'missing'] })],
  ])('rejects %s', async (_case, body) => {
    const response = await admin.patch(submissionUrl('/artworks/order')).send(body()).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });
});

describe('POST .../artworks/:artworkId/replace', () => {
  it('replaces the image and removes the old files', async () => {
    const oldPaths = artworkPaths(artworks[0]!);
    await writeStoredFiles(oldPaths);

    const response = await admin
      .post(submissionUrl(`/artworks/${artworks[0]!.id}/replace`))
      .attach('artwork', await fixtureImage({ width: 1600, height: 1000 }), 'new.jpg')
      .expect(200);

    const stored = await prisma.artwork.findUniqueOrThrow({ where: { id: artworks[0]!.id } });
    expect(stored).toMatchObject({ width: 1600, height: 1000, title: artworks[0]!.title });
    expect(stored.filePath).not.toBe(artworks[0]!.filePath);
    for (const storedPath of artworkPaths(stored)) {
      expect(await storedFileExists(storedPath)).toBe(true);
    }
    for (const storedPath of oldPaths) {
      expect(await storedFileExists(storedPath)).toBe(false);
    }
    expect((response.body as AdminSubmissionDto).artworks[0]).toMatchObject({
      width: 1600,
      height: 1000,
    });
  });

  it('rejects a request without a file', async () => {
    const response = await admin
      .post(submissionUrl(`/artworks/${artworks[0]!.id}/replace`))
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('rejects an image below the minimum size and keeps the artwork', async () => {
    await admin
      .post(submissionUrl(`/artworks/${artworks[0]!.id}/replace`))
      .attach('artwork', await fixtureImage({ width: 100, height: 100 }), 'small.jpg')
      .expect(400);

    const stored = await prisma.artwork.findUniqueOrThrow({ where: { id: artworks[0]!.id } });
    expect(stored.filePath).toBe(artworks[0]!.filePath);
  });

  it('rejects a file under another field name', async () => {
    await admin
      .post(submissionUrl(`/artworks/${artworks[0]!.id}/replace`))
      .attach('photo', await fixtureImage(), 'new.jpg')
      .expect(400);
  });

  it('answers 404 for an unknown artwork', async () => {
    await admin
      .post(submissionUrl('/artworks/missing/replace'))
      .attach('artwork', await fixtureImage(), 'new.jpg')
      .expect(404);
  });
});
