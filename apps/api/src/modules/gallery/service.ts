import type {
  AlbumDetailDto,
  AlbumKind,
  AlbumPhotoDto,
  GalleryAlbumDto,
  GalleryAlbumPreviewDto,
  PaginatedDto,
  PendingUploadDto,
} from '@foka-vote/shared';
import {
  GALLERY_ALBUM_PREVIEW_COUNT,
  MAX_ALBUM_DESCRIPTION_LENGTH,
  MAX_ALBUM_TITLE_LENGTH,
  MAX_PHOTOS_PER_ALBUM_UPLOAD,
} from '@foka-vote/shared';
import type { AlbumPhoto, AlbumSubmission } from '../../generated/prisma/client.js';
import { badRequest, notFound, unauthorized } from '../../errors/app-error.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import type { ListKey, ParsedListQuery } from '../../lib/list-query.js';
import { paginateRows, titleSearchFilter } from '../../lib/list-query.js';
import {
  claimPendingUploads,
  createPendingUpload,
  deletePendingUpload,
  toPendingUploadDto,
} from '../../lib/pending-uploads.js';
import { prisma } from '../../lib/prisma.js';
import type { SubmissionPhotoInput } from '../../lib/submission-photos.js';
import { mediaUrl } from '../../lib/storage.js';

type SignedCookies = Record<string, string | undefined>;

export const ALBUM_ACCESS_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function albumAccessCookieName(albumId: string): string {
  return `album_access_${albumId}`;
}

/**
 * Contest albums have no rows of their own, they are projected from the contests, so the
 * album's title, description and date always come straight from the contest itself.
 */
async function listContestAlbums(ids: string[]): Promise<GalleryAlbumDto[]> {
  const contests = await prisma.contest.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      submissionStart: true,
      submissionDeadline: true,
      votingStart: true,
      votingEnd: true,
      submissions: {
        orderBy: { createdAt: 'asc' },
        take: GALLERY_ALBUM_PREVIEW_COUNT,
        select: {
          id: true,
          alias: true,
          firstName: true,
          lastName: true,
          artworks: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              previewPath: true,
              thumbPath: true,
              width: true,
              height: true,
            },
          },
        },
      },
    },
  });

  const submissionCounts = await prisma.submission.groupBy({
    by: ['contestId'],
    where: { contestId: { in: contests.map((contest) => contest.id) } },
    _count: { _all: true },
  });
  const countByContestId = new Map(
    submissionCounts.map((entry) => [entry.contestId, entry._count._all]),
  );

  const now = new Date();

  return contests.map((contest) => {
    const revealNames = computeContestStatus(now, contest) === 'CLOSED';

    const previews: GalleryAlbumPreviewDto[] = contest.submissions
      .filter((submission) => submission.artworks.length > 0)
      .map((submission) => {
        const author = revealNames
          ? `${submission.firstName} ${submission.lastName}`
          : submission.alias;

        return {
          id: submission.id,
          thumbUrl: mediaUrl((submission.artworks[0] as { thumbPath: string }).thumbPath),
          label: author,
          images: submission.artworks.map((artwork) => ({
            id: artwork.id,
            title: artwork.title,
            description: artwork.description,
            previewUrl: mediaUrl(artwork.previewPath),
            width: artwork.width,
            height: artwork.height,
            author,
          })),
        };
      });

    return {
      kind: 'CONTEST',
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      description: contest.description,
      createdAt: contest.createdAt.toISOString(),
      itemCount: countByContestId.get(contest.id) ?? 0,
      previews,
    };
  });
}

async function listStandaloneAlbums(ids: string[]): Promise<GalleryAlbumDto[]> {
  const albums = await prisma.album.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      submissions: {
        orderBy: { createdAt: 'asc' },
        take: GALLERY_ALBUM_PREVIEW_COUNT,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photos: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              previewPath: true,
              thumbPath: true,
              width: true,
              height: true,
            },
          },
        },
      },
      _count: { select: { submissions: true } },
    },
  });

  return albums.map((album) => ({
    kind: 'STANDALONE',
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    createdAt: album.createdAt.toISOString(),
    itemCount: album._count.submissions,
    previews: album.submissions
      .filter((submission) => submission.photos.length > 0)
      .map((submission) => {
        const author = `${submission.firstName} ${submission.lastName}`;

        return {
          id: submission.id,
          thumbUrl: mediaUrl((submission.photos[0] as { thumbPath: string }).thumbPath),
          label: author,
          images: submission.photos.map((photo) => ({
            id: photo.id,
            title: photo.title,
            description: photo.description,
            previewUrl: mediaUrl(photo.previewPath),
            width: photo.width,
            height: photo.height,
            author,
          })),
        };
      }),
  }));
}

type AlbumListKey = ListKey & { kind: AlbumKind };

/**
 * Contest albums and standalone albums come from two tables, so the page is cut from their
 * merged keys and only the albums on it are loaded, each kind by its own loader. Shared with
 * the admin listing, which loads different DTOs.
 */
export function paginateAlbums<T extends { kind: AlbumKind; id: string }>(
  contestKeys: ListKey[],
  standaloneKeys: ListKey[],
  listQuery: ParsedListQuery,
  load: Record<AlbumKind, (ids: string[]) => Promise<T[]>>,
): Promise<PaginatedDto<T>> {
  const keys: AlbumListKey[] = [
    ...contestKeys.map((key) => ({ ...key, kind: 'CONTEST' as const })),
    ...standaloneKeys.map((key) => ({ ...key, kind: 'STANDALONE' as const })),
  ];

  const loadKind = (pageKeys: AlbumListKey[], kind: AlbumKind) => {
    const ids = pageKeys.filter((key) => key.kind === kind).map((key) => key.id);
    return ids.length > 0 ? load[kind](ids) : Promise.resolve([]);
  };

  return paginateRows(
    keys,
    listQuery,
    async (pageKeys) =>
      (await Promise.all([loadKind(pageKeys, 'CONTEST'), loadKind(pageKeys, 'STANDALONE')])).flat(),
    (entry) => `${entry.kind}-${entry.id}`,
  );
}

/** A contest shows up once its voting has started (VOTING or CLOSED in `computeContestStatus`). */
export async function listGalleryAlbums(
  listQuery: ParsedListQuery,
): Promise<PaginatedDto<GalleryAlbumDto>> {
  const keySelect = { id: true, title: true, createdAt: true } as const;
  const titleFilter = titleSearchFilter(listQuery.q);

  const [contestKeys, albumKeys] = await Promise.all([
    prisma.contest.findMany({
      where: { hiddenInGallery: false, votingStart: { lte: new Date() }, ...titleFilter },
      select: keySelect,
    }),
    prisma.album.findMany({ where: { hidden: false, ...titleFilter }, select: keySelect }),
  ]);

  return paginateAlbums(contestKeys, albumKeys, listQuery, {
    CONTEST: listContestAlbums,
    STANDALONE: listStandaloneAlbums,
  });
}

export function assertValidAlbumInput(title: string, description: string): void {
  if (title.length === 0) {
    throw badRequest('title is required');
  }
  if (title.length > MAX_ALBUM_TITLE_LENGTH) {
    throw badRequest(`title must be at most ${MAX_ALBUM_TITLE_LENGTH} characters long`);
  }
  if (description.length > MAX_ALBUM_DESCRIPTION_LENGTH) {
    throw badRequest(`description must be at most ${MAX_ALBUM_DESCRIPTION_LENGTH} characters long`);
  }
}

export function assertValidPhotoCaption(title: string | null, description: string | null): void {
  if (title !== null && title.length > MAX_ALBUM_TITLE_LENGTH) {
    throw badRequest(`photo title must be at most ${MAX_ALBUM_TITLE_LENGTH} characters long`);
  }
  if (description !== null && description.length > MAX_ALBUM_DESCRIPTION_LENGTH) {
    throw badRequest(
      `photo description must be at most ${MAX_ALBUM_DESCRIPTION_LENGTH} characters long`,
    );
  }
}

export type AlbumPhotoWithSubmission = AlbumPhoto & { submission: AlbumSubmission };

export function toAlbumPhotoDto(photo: AlbumPhotoWithSubmission): AlbumPhotoDto {
  return {
    id: photo.id,
    // Album photos are never anonymised: there is no voting phase to protect.
    authorName: `${photo.submission.firstName} ${photo.submission.lastName}`,
    title: photo.title,
    description: photo.description,
    fullUrl: mediaUrl(photo.filePath),
    previewUrl: mediaUrl(photo.previewPath),
    thumbUrl: mediaUrl(photo.thumbPath),
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt.toISOString(),
  };
}

export async function verifyAlbumAccessCode(
  slug: string,
  code: string,
): Promise<{ albumId: string }> {
  const album = await prisma.album.findFirst({
    where: { slug, hidden: false },
    select: { id: true, accessCode: true },
  });
  if (!album) {
    throw notFound('Album not found');
  }
  if (album.accessCode === null) {
    throw badRequest('This album does not require an access code');
  }
  if (code !== album.accessCode) {
    throw unauthorized('Invalid access code');
  }
  return { albumId: album.id };
}

function hasAlbumUploadAccess(
  album: { id: string; accessCode: string | null },
  signedCookies: SignedCookies,
): boolean {
  return (
    album.accessCode === null || signedCookies[albumAccessCookieName(album.id)] === album.accessCode
  );
}

export async function getPublicAlbum(
  slug: string,
  signedCookies: SignedCookies,
): Promise<AlbumDetailDto> {
  const album = await prisma.album.findFirst({
    where: { slug, hidden: false },
    include: {
      submissions: {
        orderBy: { createdAt: 'asc' },
        include: { photos: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  if (!album) {
    throw notFound('Album not found');
  }

  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    createdAt: album.createdAt.toISOString(),
    hasAccessCode: album.accessCode !== null,
    canUpload: hasAlbumUploadAccess(album, signedCookies),
    submissions: album.submissions.map(({ photos, ...submission }) => ({
      id: submission.id,
      authorName: `${submission.firstName} ${submission.lastName}`,
      createdAt: submission.createdAt.toISOString(),
      photos: photos.map((photo) => toAlbumPhotoDto({ ...photo, submission })),
    })),
  };
}

async function findAlbumForUpload(slug: string, signedCookies: SignedCookies) {
  const album = await prisma.album.findFirst({
    where: { slug, hidden: false },
    select: { id: true, accessCode: true },
  });
  if (!album) {
    throw notFound('Album not found');
  }
  if (!hasAlbumUploadAccess(album, signedCookies)) {
    throw unauthorized('Access code required');
  }
  return album;
}

export async function addPendingAlbumUpload(
  slug: string,
  file: Express.Multer.File,
  signedCookies: SignedCookies,
): Promise<PendingUploadDto> {
  const album = await findAlbumForUpload(slug, signedCookies);
  const upload = await createPendingUpload({ albumId: album.id }, file.buffer);
  return toPendingUploadDto(upload);
}

export async function removePendingAlbumUpload(
  slug: string,
  uploadId: string,
  signedCookies: SignedCookies,
): Promise<void> {
  const album = await findAlbumForUpload(slug, signedCookies);
  await deletePendingUpload({ albumId: album.id }, uploadId);
}

export interface CreateAlbumSubmissionInput {
  firstName: string;
  lastName: string;
  photos: SubmissionPhotoInput[];
}

export async function createAlbumSubmission(
  slug: string,
  input: CreateAlbumSubmissionInput,
  signedCookies: SignedCookies,
): Promise<void> {
  const album = await findAlbumForUpload(slug, signedCookies);

  if (input.photos.length < 1 || input.photos.length > MAX_PHOTOS_PER_ALBUM_UPLOAD) {
    throw badRequest(`Upload must include between 1 and ${MAX_PHOTOS_PER_ALBUM_UPLOAD} photos`);
  }
  for (const photo of input.photos) {
    assertValidPhotoCaption(photo.title, photo.description);
  }

  await prisma.$transaction(async (tx) => {
    const uploads = await claimPendingUploads(
      tx,
      { albumId: album.id },
      input.photos.map((photo) => photo.uploadId),
    );
    await tx.albumSubmission.create({
      data: {
        albumId: album.id,
        firstName: input.firstName,
        lastName: input.lastName,
        rulesAcceptedAt: new Date(),
        photos: {
          create: uploads.map((upload, index) => ({
            title: input.photos[index]?.title ?? null,
            description: input.photos[index]?.description ?? null,
            filePath: upload.filePath,
            previewPath: upload.previewPath,
            thumbPath: upload.thumbPath,
            width: upload.width,
            height: upload.height,
            sortOrder: index,
          })),
        },
      },
    });
  });
}
