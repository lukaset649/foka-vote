import type {
  AdminAlbumDto,
  AdminAlbumPhotoDto,
  GalleryAlbumDto,
  PaginatedDto,
} from '@foka-vote/shared';
import { MAX_ALBUM_DESCRIPTION_LENGTH, MAX_ALBUM_TITLE_LENGTH } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import {
  createAlbum,
  createAlbumSubmission,
  createContest,
  createPendingUpload,
  createSubmission,
} from '../factories.js';
import { api, loginAsAdmin } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';
import { storedFileExists, writeStoredFiles } from '../helpers/storage.js';

const ALBUMS_URL = '/api/admin/gallery/albums';

async function publicAlbumIds(): Promise<string[]> {
  const response = await api().get('/api/gallery/albums').expect(200);
  return (response.body as PaginatedDto<GalleryAlbumDto>).items.map((entry) => entry.id);
}

describe('GET /api/admin/gallery/albums', () => {
  it('lists every album and contest with admin fields', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum({
      hidden: true,
      accessCode: 'SECRET',
      createdAt: new Date('2026-01-02'),
    });
    await createAlbumSubmission(album.id, { photoCount: 2 });
    await createAlbumSubmission(album.id);
    const draft = await createContest({ phase: 'DRAFT', createdAt: new Date('2026-01-01') });

    const response = await admin.get(ALBUMS_URL).expect(200);
    const body = response.body as PaginatedDto<AdminAlbumDto>;

    expect(body.items.map((entry) => [entry.kind, entry.id])).toEqual([
      ['STANDALONE', album.id],
      ['CONTEST', draft.id],
    ]);
    expect(body.items[0]).toMatchObject({ accessCode: 'SECRET', hidden: true, itemCount: 2 });
    expect(body.items[0]!.coverThumbUrl).toMatch(/^\/media\/.+-thumb\.webp$/);
    expect(body.items[1]).toMatchObject({ itemCount: 0, coverThumbUrl: null, hidden: false });
  });

  it('searches by title', async () => {
    const admin = await loginAsAdmin();
    await createAlbum({ title: 'Lato' });
    await createContest({ title: 'Zima' });

    const response = await admin.get(ALBUMS_URL).query({ q: 'zim' }).expect(200);

    expect(
      (response.body as PaginatedDto<AdminAlbumDto>).items.map((entry) => entry.title),
    ).toEqual(['Zima']);
  });
});

describe('POST /api/admin/gallery/albums', () => {
  it('creates an album with a slug from the title', async () => {
    const admin = await loginAsAdmin();

    const response = await admin
      .post(ALBUMS_URL)
      .send({ title: ' Zażółć gęślą jaźń ', description: ' Opis ', accessCode: ' KOD ' })
      .expect(201);

    expect(response.body).toMatchObject({
      kind: 'STANDALONE',
      slug: 'zazolc-gesla-jazn',
      title: 'Zażółć gęślą jaźń',
      description: 'Opis',
      accessCode: 'KOD',
      hidden: false,
      itemCount: 0,
    });
  });

  it('stores blank description and access code as null', async () => {
    const admin = await loginAsAdmin();

    const response = await admin
      .post(ALBUMS_URL)
      .send({ title: 'Lato', description: '  ', accessCode: '' })
      .expect(201);

    expect(response.body).toMatchObject({ description: null, accessCode: null });
  });

  it.each([
    ['a taken slug', 'Lato', ['lato'], 'lato-2'],
    ['the next free suffix', 'Lato', ['lato', 'lato-2'], 'lato-3'],
    ['a reserved slug', 'New', [], 'new-2'],
    ['a title without slug characters', '!!!', [], 'album'],
  ])('picks a unique slug for %s', async (_case, title, taken, expected) => {
    const admin = await loginAsAdmin();
    for (const slug of taken) {
      // eslint-disable-next-line no-await-in-loop -- a handful of fixtures
      await createAlbum({ slug });
    }

    const response = await admin.post(ALBUMS_URL).send({ title }).expect(201);

    expect((response.body as AdminAlbumDto).slug).toBe(expected);
  });

  it.each([
    ['a missing title', {}],
    ['a blank title', { title: '   ' }],
    ['a title that is too long', { title: 'x'.repeat(MAX_ALBUM_TITLE_LENGTH + 1) }],
    [
      'a description that is too long',
      { title: 'Lato', description: 'x'.repeat(MAX_ALBUM_DESCRIPTION_LENGTH + 1) },
    ],
    ['a non-string title', { title: 1 }],
    ['a non-string access code', { title: 'Lato', accessCode: 1 }],
    ['a body that is not an object', ['Lato']],
  ])('rejects %s', async (_case, body) => {
    const admin = await loginAsAdmin();

    const response = await admin.post(ALBUMS_URL).send(body).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect(await prisma.album.count()).toBe(0);
  });
});

describe('GET /api/admin/gallery/albums/:id', () => {
  it('returns the album', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum({ accessCode: 'SECRET' });

    const response = await admin.get(`${ALBUMS_URL}/${album.id}`).expect(200);

    expect(response.body).toMatchObject({ id: album.id, accessCode: 'SECRET' });
  });

  it('answers 404 for an unknown album', async () => {
    const admin = await loginAsAdmin();

    const response = await admin.get(`${ALBUMS_URL}/missing`).expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/admin/gallery/albums/:id', () => {
  it('updates the given fields and keeps the slug', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum({ slug: 'lato', description: 'Opis', accessCode: 'KOD' });

    const response = await admin
      .patch(`${ALBUMS_URL}/${album.id}`)
      .send({ title: ' Zima ', accessCode: '' })
      .expect(200);

    expect(response.body).toMatchObject({
      slug: 'lato',
      title: 'Zima',
      description: 'Opis',
      accessCode: null,
    });
  });

  it.each([
    ['a blank title', { title: ' ' }],
    ['a non-string description', { description: 1 }],
    ['a body that is not an object', ['Zima']],
  ])('rejects %s', async (_case, body) => {
    const admin = await loginAsAdmin();
    const album = await createAlbum({ title: 'Lato' });

    await admin.patch(`${ALBUMS_URL}/${album.id}`).send(body).expect(400);

    expect((await prisma.album.findUniqueOrThrow({ where: { id: album.id } })).title).toBe('Lato');
  });

  it('answers 404 for an unknown album', async () => {
    const admin = await loginAsAdmin();

    await admin.patch(`${ALBUMS_URL}/missing`).send({ title: 'Zima' }).expect(404);
  });
});

describe('PATCH /api/admin/gallery/albums/:id/visibility', () => {
  it('hides and shows the album in the public gallery', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();

    const hidden = await admin
      .patch(`${ALBUMS_URL}/${album.id}/visibility`)
      .send({ hidden: true })
      .expect(200);
    expect(hidden.body).toMatchObject({ hidden: true });
    expect(await publicAlbumIds()).toEqual([]);

    await admin.patch(`${ALBUMS_URL}/${album.id}/visibility`).send({ hidden: false }).expect(200);
    expect(await publicAlbumIds()).toEqual([album.id]);
  });

  it('rejects a non-boolean value', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();

    await admin.patch(`${ALBUMS_URL}/${album.id}/visibility`).send({ hidden: 'yes' }).expect(400);
  });

  it('answers 404 for an unknown album', async () => {
    const admin = await loginAsAdmin();

    await admin.patch(`${ALBUMS_URL}/missing/visibility`).send({ hidden: true }).expect(404);
  });
});

describe('PATCH /api/admin/gallery/contests/:contestId/visibility', () => {
  it('hides and shows the contest in the public gallery', async () => {
    const admin = await loginAsAdmin();
    const contest = await createContest({ phase: 'CLOSED' });
    await createSubmission(contest.id);

    const response = await admin
      .patch(`/api/admin/gallery/contests/${contest.id}/visibility`)
      .send({ hidden: true })
      .expect(200);
    expect(response.body).toMatchObject({ kind: 'CONTEST', hidden: true, itemCount: 1 });
    expect(await publicAlbumIds()).toEqual([]);

    await admin
      .patch(`/api/admin/gallery/contests/${contest.id}/visibility`)
      .send({ hidden: false })
      .expect(200);
    expect(await publicAlbumIds()).toEqual([contest.id]);
  });

  it('rejects a non-boolean value', async () => {
    const admin = await loginAsAdmin();
    const contest = await createContest();

    await admin.patch(`/api/admin/gallery/contests/${contest.id}/visibility`).send({}).expect(400);
  });

  it('answers 404 for an unknown contest', async () => {
    const admin = await loginAsAdmin();

    await admin
      .patch('/api/admin/gallery/contests/missing/visibility')
      .send({ hidden: true })
      .expect(404);
  });
});

describe('DELETE /api/admin/gallery/albums/:id', () => {
  it('removes the album with its photos, pending uploads and files', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const other = await createAlbum();
    const submission = await createAlbumSubmission(album.id, { photoCount: 2 });
    const kept = await createAlbumSubmission(other.id);
    const pending = await createPendingUpload({ albumId: album.id });
    const removedPaths = [
      ...submission.photos.flatMap((photo) => [photo.filePath, photo.previewPath, photo.thumbPath]),
      pending.filePath,
      pending.previewPath,
      pending.thumbPath,
    ];
    const keptPaths = kept.photos.map((photo) => photo.filePath);
    await writeStoredFiles([...removedPaths, ...keptPaths]);

    await admin.delete(`${ALBUMS_URL}/${album.id}`).expect(204);

    expect(await prisma.album.findMany({ select: { id: true } })).toEqual([{ id: other.id }]);
    expect(await prisma.albumPhoto.count()).toBe(1);
    expect(await prisma.pendingUpload.count()).toBe(0);
    for (const storedPath of removedPaths) {
      expect(await storedFileExists(storedPath)).toBe(false);
    }
    expect(await storedFileExists(keptPaths[0]!)).toBe(true);
  });

  it('answers 404 for an unknown album', async () => {
    const admin = await loginAsAdmin();

    await admin.delete(`${ALBUMS_URL}/missing`).expect(404);
  });
});

describe('GET /api/admin/gallery/albums/:id/photos', () => {
  it('lists photos with author details, by upload then position', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const first = await createAlbumSubmission(album.id, {
      firstName: 'Ewa',
      lastName: 'Lis',
      photoCount: 2,
    });
    const second = await createAlbumSubmission(album.id);
    await prisma.albumSubmission.update({
      where: { id: second.id },
      data: { createdAt: new Date(first.createdAt.getTime() + 1000) },
    });
    await createAlbumSubmission((await createAlbum()).id);

    const response = await admin.get(`${ALBUMS_URL}/${album.id}/photos`).expect(200);
    const photos = response.body as AdminAlbumPhotoDto[];

    const sortedFirst = [...first.photos].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(photos.map((photo) => photo.id)).toEqual([
      ...sortedFirst.map((photo) => photo.id),
      second.photos[0]!.id,
    ]);
    expect(photos[0]).toMatchObject({ firstName: 'Ewa', lastName: 'Lis', authorName: 'Ewa Lis' });
    expect(photos[0]!.rulesAcceptedAt).toBe(first.rulesAcceptedAt.toISOString());
  });

  it('answers 404 for an unknown album', async () => {
    const admin = await loginAsAdmin();

    await admin.get(`${ALBUMS_URL}/missing/photos`).expect(404);
  });
});

describe('PATCH /api/admin/gallery/albums/:id/photos/:photoId', () => {
  it('trims captions and stores blank ones as null', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const { photos } = await createAlbumSubmission(album.id);

    const response = await admin
      .patch(`${ALBUMS_URL}/${album.id}/photos/${photos[0]!.id}`)
      .send({ title: ' Zachód ', description: '   ' })
      .expect(200);

    expect(response.body).toMatchObject({ title: 'Zachód', description: null });
  });

  it('keeps fields that are not sent', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const { photos } = await createAlbumSubmission(album.id);

    const response = await admin
      .patch(`${ALBUMS_URL}/${album.id}/photos/${photos[0]!.id}`)
      .send({ description: 'Opis' })
      .expect(200);

    expect(response.body).toMatchObject({ title: photos[0]!.title, description: 'Opis' });
  });

  it.each([
    ['a title that is too long', { title: 'x'.repeat(MAX_ALBUM_TITLE_LENGTH + 1) }],
    ['a non-string description', { description: 1 }],
    ['a body that is not an object', ['Zachód']],
  ])('rejects %s', async (_case, body) => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const { photos } = await createAlbumSubmission(album.id);

    await admin.patch(`${ALBUMS_URL}/${album.id}/photos/${photos[0]!.id}`).send(body).expect(400);
  });

  it('answers 404 for a photo of another album', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const { photos } = await createAlbumSubmission((await createAlbum()).id);

    await admin
      .patch(`${ALBUMS_URL}/${album.id}/photos/${photos[0]!.id}`)
      .send({ title: 'Zachód' })
      .expect(404);
  });
});

describe('DELETE /api/admin/gallery/albums/:id/photos/:photoId', () => {
  it('removes the photo and its files but keeps the rest of the upload', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const submission = await createAlbumSubmission(album.id, { photoCount: 2 });
    const [removed] = submission.photos;
    const paths = [removed!.filePath, removed!.previewPath, removed!.thumbPath];
    await writeStoredFiles(paths);

    await admin.delete(`${ALBUMS_URL}/${album.id}/photos/${removed!.id}`).expect(204);

    expect(await prisma.albumPhoto.count()).toBe(1);
    expect(await prisma.albumSubmission.count()).toBe(1);
    for (const storedPath of paths) {
      expect(await storedFileExists(storedPath)).toBe(false);
    }
  });

  it('removes the upload entry together with its last photo', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const { photos } = await createAlbumSubmission(album.id);

    await admin.delete(`${ALBUMS_URL}/${album.id}/photos/${photos[0]!.id}`).expect(204);

    expect(await prisma.albumSubmission.count()).toBe(0);
  });

  it('answers 404 for a photo of another album', async () => {
    const admin = await loginAsAdmin();
    const album = await createAlbum();
    const { photos } = await createAlbumSubmission((await createAlbum()).id);

    await admin.delete(`${ALBUMS_URL}/${album.id}/photos/${photos[0]!.id}`).expect(404);

    expect(await prisma.albumPhoto.count()).toBe(1);
  });
});
