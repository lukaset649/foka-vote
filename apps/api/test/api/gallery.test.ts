import type {
  AlbumDetailDto,
  GalleryAlbumDto,
  PaginatedDto,
  PendingUploadDto,
} from '@foka-vote/shared';
import { MAX_ALBUM_TITLE_LENGTH, MAX_PHOTOS_PER_ALBUM_UPLOAD } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import type { Album } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  createAlbum,
  createAlbumSubmission,
  createContest,
  createPendingUpload,
  createSubmission,
} from '../factories.js';
import { agent, api } from '../helpers/app.js';
import { fixtureImage } from '../helpers/images.js';
import { errorCode } from '../helpers/responses.js';

function albumUrl(album: Album): string {
  return `/api/gallery/albums/${album.slug}`;
}

async function listAlbums(query: Record<string, string | number> = {}) {
  const response = await api().get('/api/gallery/albums').query(query).expect(200);
  return response.body as PaginatedDto<GalleryAlbumDto>;
}

describe('GET /api/gallery/albums', () => {
  it('lists visible albums and contests whose voting has started', async () => {
    const album = await createAlbum({ createdAt: new Date('2026-01-05') });
    await createAlbum({ hidden: true });
    const voting = await createContest({ phase: 'VOTING', createdAt: new Date('2026-01-04') });
    const closed = await createContest({ phase: 'CLOSED', createdAt: new Date('2026-01-03') });
    await createContest({ phase: 'DRAFT' });
    await createContest({ phase: 'SUBMISSIONS' });
    await createContest({ phase: 'CLOSED', hiddenInGallery: true });

    const body = await listAlbums();

    expect(body.items.map((entry) => [entry.kind, entry.id])).toEqual([
      ['STANDALONE', album.id],
      ['CONTEST', voting.id],
      ['CONTEST', closed.id],
    ]);
    expect(body.total).toBe(3);
  });

  it('never exposes access codes', async () => {
    await createAlbum({ accessCode: 'SECRET' });
    await createContest({ phase: 'CLOSED', accessCode: 'SECRET' });

    const body = await listAlbums();

    expect(JSON.stringify(body)).not.toContain('SECRET');
  });

  it('shows contest authors by nickname until the contest is closed', async () => {
    const voting = await createContest({ phase: 'VOTING' });
    const closed = await createContest({ phase: 'CLOSED' });
    await createSubmission(voting.id, { alias: 'Foka', firstName: 'Jan', lastName: 'Kowalski' });
    await createSubmission(closed.id, { alias: 'Mewa', firstName: 'Ewa', lastName: 'Lis' });

    const body = await listAlbums();
    const labels = (id: string) =>
      body.items.find((entry) => entry.id === id)!.previews.map((preview) => preview.label);

    expect(labels(voting.id)).toEqual(['Foka']);
    expect(labels(closed.id)).toEqual(['Ewa Lis']);
  });

  it('counts uploads and limits previews', async () => {
    const album = await createAlbum();
    for (let index = 0; index < 10; index++) {
      // eslint-disable-next-line no-await-in-loop -- keeps creation order deterministic
      await createAlbumSubmission(album.id, { photoCount: 2 });
    }

    const [entry] = (await listAlbums()).items;

    expect(entry).toMatchObject({ itemCount: 10 });
    expect(entry!.previews).toHaveLength(8);
    expect(entry!.previews[0]!.images).toHaveLength(2);
  });

  it('searches and paginates', async () => {
    await createAlbum({ title: 'Lato w mieście' });
    await createContest({ phase: 'CLOSED', title: 'Lato nad morzem' });
    await createAlbum({ title: 'Zima' });

    const body = await listAlbums({ q: 'lato', sort: 'title', pageSize: 1, page: 2 });

    expect(body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(body.items.map((entry) => entry.title)).toEqual(['Lato w mieście']);
  });

  it('rejects an invalid list query', async () => {
    const response = await api().get('/api/gallery/albums').query({ sort: 'x' }).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/gallery/albums/:slug', () => {
  it('returns the album with its uploads in order', async () => {
    const album = await createAlbum({ description: 'Opis' });
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

    const response = await api().get(albumUrl(album)).expect(200);
    const body = response.body as AlbumDetailDto;

    expect(body).toMatchObject({
      id: album.id,
      description: 'Opis',
      hasAccessCode: false,
      canUpload: true,
    });
    expect(body.submissions.map((submission) => submission.id)).toEqual([first.id, second.id]);
    expect(body.submissions[0]!.authorName).toBe('Ewa Lis');
    expect(body.submissions[0]!.photos.map((photo) => photo.id)).toEqual(
      [...first.photos].sort((a, b) => a.sortOrder - b.sortOrder).map((photo) => photo.id),
    );
  });

  it('reports upload access for an album with a code', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });
    const visitor = agent();

    const before = await visitor.get(albumUrl(album)).expect(200);
    await visitor
      .post(`${albumUrl(album)}/access`)
      .send({ code: 'SECRET' })
      .expect(204);
    const after = await visitor.get(albumUrl(album)).expect(200);

    expect(before.body).toMatchObject({ hasAccessCode: true, canUpload: false });
    expect(before.body).not.toHaveProperty('accessCode');
    expect(after.body).toMatchObject({ canUpload: true });
  });

  it.each([
    ['an unknown slug', () => Promise.resolve('missing')],
    ['a hidden album', async () => (await createAlbum({ hidden: true })).slug],
  ])('answers 404 for %s', async (_case, slug) => {
    const response = await api()
      .get(`/api/gallery/albums/${await slug()}`)
      .expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('POST /api/gallery/albums/:slug/access', () => {
  it('sets a signed, http-only access cookie for the right code', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });

    const response = await api()
      .post(`${albumUrl(album)}/access`)
      .send({ code: 'SECRET' });

    expect(response.status).toBe(204);
    const cookie = (response.headers['set-cookie'] as unknown as string[] | undefined)?.find(
      (value) => value.startsWith(`album_access_${album.id}=s%3A`),
    );
    expect(cookie).toContain('HttpOnly');
  });

  it('rejects a wrong code', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });

    await api()
      .post(`${albumUrl(album)}/access`)
      .send({ code: 'other' })
      .expect(401);
  });

  it.each([
    ['a missing code', {}],
    ['an empty code', { code: '' }],
    ['a blank code', { code: '   ' }],
  ])('rejects %s', async (_case, body) => {
    const album = await createAlbum({ accessCode: 'SECRET' });

    await api()
      .post(`${albumUrl(album)}/access`)
      .send(body)
      .expect(400);
  });

  it('accepts the code with surrounding whitespace', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });
    const visitor = agent();

    await visitor
      .post(`${albumUrl(album)}/access`)
      .send({ code: ' SECRET ' })
      .expect(204);
    const response = await visitor.get(albumUrl(album)).expect(200);

    expect(response.body).toMatchObject({ canUpload: true });
  });

  it('rejects a code for an album without one', async () => {
    const album = await createAlbum();

    await api()
      .post(`${albumUrl(album)}/access`)
      .send({ code: 'SECRET' })
      .expect(400);
  });

  it('answers 404 for a hidden album', async () => {
    const album = await createAlbum({ hidden: true, accessCode: 'SECRET' });

    await api()
      .post(`${albumUrl(album)}/access`)
      .send({ code: 'SECRET' })
      .expect(404);
  });
});

describe('POST /api/gallery/albums/:slug/uploads', () => {
  it('stores a pending upload for the album', async () => {
    const album = await createAlbum();

    const response = await api()
      .post(`${albumUrl(album)}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(201);

    const upload = await prisma.pendingUpload.findUniqueOrThrow({
      where: { id: (response.body as PendingUploadDto).id },
    });
    expect(upload).toMatchObject({ albumId: album.id, contestId: null });
  });

  it('requires the access code cookie when the album has a code', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });
    const visitor = agent();

    await visitor
      .post(`${albumUrl(album)}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(401);
    await visitor
      .post(`${albumUrl(album)}/access`)
      .send({ code: 'SECRET' })
      .expect(204);
    await visitor
      .post(`${albumUrl(album)}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(201);
  });

  it('rejects a file that is not an image', async () => {
    const album = await createAlbum();

    await api()
      .post(`${albumUrl(album)}/uploads`)
      .attach('photo', Buffer.from('not an image'), 'photo.jpg')
      .expect(400);
  });

  it('answers 404 for a hidden album', async () => {
    const album = await createAlbum({ hidden: true });

    await api()
      .post(`${albumUrl(album)}/uploads`)
      .attach('photo', await fixtureImage(), 'photo.jpg')
      .expect(404);
  });
});

describe('DELETE /api/gallery/albums/:slug/uploads/:uploadId', () => {
  it('removes only uploads of this album', async () => {
    const album = await createAlbum();
    const other = await createAlbum();
    const own = await createPendingUpload({ albumId: album.id });
    const foreign = await createPendingUpload({ albumId: other.id });

    await api()
      .delete(`${albumUrl(album)}/uploads/${own.id}`)
      .expect(204);
    await api()
      .delete(`${albumUrl(album)}/uploads/${foreign.id}`)
      .expect(204);

    expect((await prisma.pendingUpload.findMany()).map((upload) => upload.id)).toEqual([
      foreign.id,
    ]);
  });

  it('requires the access code cookie when the album has a code', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });

    await api()
      .delete(`${albumUrl(album)}/uploads/any`)
      .expect(401);
  });
});

describe('POST /api/gallery/albums/:slug/submissions', () => {
  async function payload(album: Album, overrides: Record<string, unknown> = {}) {
    const uploads = await Promise.all([
      createPendingUpload({ albumId: album.id }),
      createPendingUpload({ albumId: album.id }),
    ]);
    return {
      firstName: 'Ewa',
      lastName: 'Lis',
      rulesAccepted: true,
      photos: [
        { uploadId: uploads[1].id, title: ' Zachód ' },
        { uploadId: uploads[0].id, description: 'Opis' },
      ],
      ...overrides,
    };
  }

  it('creates the upload entry from pending uploads in the given order', async () => {
    const album = await createAlbum();
    const body = await payload(album, { firstName: ' Ewa ' });

    await api()
      .post(`${albumUrl(album)}/submissions`)
      .send(body)
      .expect(201);

    const submission = await prisma.albumSubmission.findFirstOrThrow({
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(submission).toMatchObject({ albumId: album.id, firstName: 'Ewa', lastName: 'Lis' });
    expect(submission.photos.map((photo) => [photo.title, photo.description])).toEqual([
      ['Zachód', null],
      [null, 'Opis'],
    ]);
    expect(await prisma.pendingUpload.count()).toBe(0);
  });

  it.each([
    ['a blank first name', { firstName: ' ' }],
    ['a missing last name', { lastName: undefined }],
    ['rules that are not accepted', { rulesAccepted: false }],
    ['no photos', { photos: [] }],
    [
      'too many photos',
      {
        photos: Array.from({ length: MAX_PHOTOS_PER_ALBUM_UPLOAD + 1 }, (_, index) => ({
          uploadId: `upload-${index}`,
        })),
      },
    ],
  ])('rejects %s', async (_case, overrides) => {
    const album = await createAlbum();

    const response = await api()
      .post(`${albumUrl(album)}/submissions`)
      .send(await payload(album, overrides))
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
    expect(await prisma.albumSubmission.count()).toBe(0);
  });

  it('rejects a photo title that is too long', async () => {
    const album = await createAlbum();
    const upload = await createPendingUpload({ albumId: album.id });

    await api()
      .post(`${albumUrl(album)}/submissions`)
      .send(
        await payload(album, {
          photos: [{ uploadId: upload.id, title: 'x'.repeat(MAX_ALBUM_TITLE_LENGTH + 1) }],
        }),
      )
      .expect(400);
  });

  it('rejects an upload of another album and keeps the uploads', async () => {
    const album = await createAlbum();
    const foreign = await createPendingUpload({ albumId: (await createAlbum()).id });
    const own = await createPendingUpload({ albumId: album.id });

    await api()
      .post(`${albumUrl(album)}/submissions`)
      .send(await payload(album, { photos: [{ uploadId: own.id }, { uploadId: foreign.id }] }))
      .expect(400);

    expect(await prisma.pendingUpload.count({ where: { id: { in: [own.id, foreign.id] } } })).toBe(
      2,
    );
  });

  it('requires the access code cookie when the album has a code', async () => {
    const album = await createAlbum({ accessCode: 'SECRET' });

    await api()
      .post(`${albumUrl(album)}/submissions`)
      .send(await payload(album))
      .expect(401);
  });

  it('answers 404 for a hidden album', async () => {
    const album = await createAlbum({ hidden: true });

    await api()
      .post(`${albumUrl(album)}/submissions`)
      .send(await payload(album))
      .expect(404);
  });
});
