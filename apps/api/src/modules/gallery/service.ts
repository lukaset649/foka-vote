import type {
  AlbumDetailDto,
  AlbumPhotoDto,
  GalleryAlbumDto,
  GalleryAlbumPreviewDto,
} from '@foka-vote/shared';
import {
  GALLERY_ALBUM_PREVIEW_COUNT,
  MAX_ALBUM_DESCRIPTION_LENGTH,
  MAX_ALBUM_TITLE_LENGTH,
  MAX_PHOTOS_PER_ALBUM_UPLOAD,
} from '@foka-vote/shared';
import type { AlbumPhoto } from '../../generated/prisma/client.js';
import { badRequest, notFound, unauthorized } from '../../errors/app-error.js';
import type { ArtworkImageResult } from '../../lib/artwork-image.js';
import { processArtworkImage } from '../../lib/artwork-image.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import type { ArtworkMetaInput } from '../../lib/artwork-meta.js';
import { prisma } from '../../lib/prisma.js';
import { mediaUrl, removeStoredFiles } from '../../lib/storage.js';

type SignedCookies = Record<string, string | undefined>;

export const ALBUM_ACCESS_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function albumAccessCookieName(albumId: string): string {
  return `album_access_${albumId}`;
}

/**
 * Contest albums have no rows of their own, they are projected from the contests, so the
 * album's title, description and date always come straight from the contest itself.
 */
async function listContestAlbums(): Promise<GalleryAlbumDto[]> {
  const contests = await prisma.contest.findMany({
    where: { hiddenInGallery: false },
    orderBy: { createdAt: 'desc' },
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

  return contests
    .filter((contest) => {
      const status = computeContestStatus(now, contest);
      return status === 'VOTING' || status === 'CLOSED';
    })
    .map((contest) => {
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

async function listStandaloneAlbums(): Promise<GalleryAlbumDto[]> {
  const albums = await prisma.album.findMany({
    where: { hidden: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      photos: {
        orderBy: { createdAt: 'asc' },
        take: GALLERY_ALBUM_PREVIEW_COUNT,
        select: {
          id: true,
          title: true,
          description: true,
          firstName: true,
          lastName: true,
          previewPath: true,
          thumbPath: true,
          width: true,
          height: true,
        },
      },
      _count: { select: { photos: true } },
    },
  });

  return albums.map((album) => ({
    kind: 'STANDALONE',
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    createdAt: album.createdAt.toISOString(),
    itemCount: album._count.photos,
    previews: album.photos.map((photo) => {
      const author = `${photo.firstName} ${photo.lastName}`;

      return {
        id: photo.id,
        thumbUrl: mediaUrl(photo.thumbPath),
        label: author,
        images: [
          {
            id: photo.id,
            title: photo.title,
            description: photo.description,
            previewUrl: mediaUrl(photo.previewPath),
            width: photo.width,
            height: photo.height,
            author,
          },
        ],
      };
    }),
  }));
}

export async function listGalleryAlbums(): Promise<GalleryAlbumDto[]> {
  const [contestAlbums, standaloneAlbums] = await Promise.all([
    listContestAlbums(),
    listStandaloneAlbums(),
  ]);

  // Both sides produce ISO-8601 UTC timestamps, which sort chronologically as strings.
  return [...contestAlbums, ...standaloneAlbums].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
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

export function toAlbumPhotoDto(photo: AlbumPhoto): AlbumPhotoDto {
  return {
    id: photo.id,
    // Album photos are never anonymised: there is no voting phase to protect.
    authorName: `${photo.firstName} ${photo.lastName}`,
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
      photos: { orderBy: { createdAt: 'asc' } },
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
    photos: album.photos.map(toAlbumPhotoDto),
  };
}

export interface AddAlbumPhotosInput {
  firstName: string;
  lastName: string;
}

async function removeProcessedFiles(processed: ArtworkImageResult[]): Promise<void> {
  await removeStoredFiles(
    processed.flatMap((file) => [file.filePath, file.previewPath, file.thumbPath]),
  );
}

export async function addAlbumPhotos(
  slug: string,
  input: AddAlbumPhotosInput,
  files: Express.Multer.File[],
  meta: ArtworkMetaInput[],
  signedCookies: SignedCookies,
): Promise<void> {
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

  if (files.length < 1 || files.length > MAX_PHOTOS_PER_ALBUM_UPLOAD) {
    throw badRequest(`Upload must include between 1 and ${MAX_PHOTOS_PER_ALBUM_UPLOAD} photos`);
  }
  if (meta.length !== files.length) {
    throw badRequest('photos metadata length must match the number of uploaded files');
  }
  // Checked before any image is processed, so a rejected caption leaves no orphan files.
  for (const entry of meta) {
    assertValidPhotoCaption(entry.title ?? null, entry.description ?? null);
  }

  const settled = await Promise.allSettled(files.map((file) => processArtworkImage(file.buffer)));

  const processed: ArtworkImageResult[] = [];
  let firstError: Error | undefined;
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      processed.push(result.value);
    } else if (firstError === undefined) {
      firstError = result.reason as Error;
    }
  }

  if (firstError !== undefined) {
    await removeProcessedFiles(processed);
    throw firstError;
  }

  const rulesAcceptedAt = new Date();

  try {
    await prisma.albumPhoto.createMany({
      data: processed.map((file, index) => ({
        albumId: album.id,
        firstName: input.firstName,
        lastName: input.lastName,
        title: meta[index]?.title ?? null,
        description: meta[index]?.description ?? null,
        filePath: file.filePath,
        previewPath: file.previewPath,
        thumbPath: file.thumbPath,
        width: file.width,
        height: file.height,
        rulesAcceptedAt,
      })),
    });
  } catch (error) {
    await removeProcessedFiles(processed);
    throw error;
  }
}
