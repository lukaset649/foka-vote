import type {
  AdminAlbumDto,
  AdminAlbumPhotoDto,
  CreateAlbumDto,
  UpdateAlbumDto,
  UpdateAlbumPhotoDto,
} from '@foka-vote/shared';
import { RESERVED_ALBUM_SLUGS } from '@foka-vote/shared';
import type { AlbumPhoto } from '../../../generated/prisma/client.js';
import { conflict, notFound } from '../../../errors/app-error.js';
import { prisma } from '../../../lib/prisma.js';
import { slugify } from '../../../lib/slugify.js';
import { mediaUrl, removeStoredFiles } from '../../../lib/storage.js';
import {
  assertValidAlbumInput,
  assertValidPhotoCaption,
  toAlbumPhotoDto,
} from '../../gallery/service.js';

const FALLBACK_ALBUM_SLUG = 'album';

const standaloneAlbumSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  createdAt: true,
  accessCode: true,
  hidden: true,
  // Any status: a brand new album only has photos that are still waiting for approval.
  photos: { orderBy: { createdAt: 'asc' }, take: 1, select: { thumbPath: true } },
} as const;

interface StandaloneAlbumRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: Date;
  accessCode: string | null;
  hidden: boolean;
  photos: { thumbPath: string }[];
}

function toAdminAlbumDto(album: StandaloneAlbumRow, photoCount: number): AdminAlbumDto {
  const coverThumbPath = album.photos[0]?.thumbPath;

  return {
    kind: 'STANDALONE',
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    createdAt: album.createdAt.toISOString(),
    accessCode: album.accessCode,
    hidden: album.hidden,
    photoCount,
    coverThumbUrl: coverThumbPath ? mediaUrl(coverThumbPath) : null,
  };
}

/**
 * Deliberately not shared with the public listing: an admin sees hidden contests too, is
 * never locked out by an access code, and needs moderation counters instead of a preview
 * grid. Keeping the queries apart also keeps admin-only fields out of the public DTOs.
 */
async function listContestAlbums(): Promise<AdminAlbumDto[]> {
  const contests = await prisma.contest.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      accessCode: true,
      hiddenInGallery: true,
      submissions: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: {
          artworks: { orderBy: { sortOrder: 'asc' }, take: 1, select: { thumbPath: true } },
        },
      },
    },
  });

  const submissionCounts = await prisma.submission.groupBy({
    by: ['contestId'],
    _count: { _all: true },
  });
  const countByContestId = new Map(
    submissionCounts.map((entry) => [entry.contestId, entry._count._all]),
  );

  return contests.map((contest) => {
    const coverThumbPath = contest.submissions[0]?.artworks[0]?.thumbPath;

    return {
      kind: 'CONTEST',
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      description: contest.description,
      createdAt: contest.createdAt.toISOString(),
      accessCode: contest.accessCode,
      hidden: contest.hiddenInGallery,
      photoCount: countByContestId.get(contest.id) ?? 0,
      coverThumbUrl: coverThumbPath ? mediaUrl(coverThumbPath) : null,
    };
  });
}

async function listStandaloneAlbums(): Promise<AdminAlbumDto[]> {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: 'desc' },
    select: standaloneAlbumSelect,
  });

  const photoCounts = await prisma.albumPhoto.groupBy({
    by: ['albumId'],
    _count: { _all: true },
  });
  const countByAlbumId = new Map(photoCounts.map((entry) => [entry.albumId, entry._count._all]));

  return albums.map((album) => toAdminAlbumDto(album, countByAlbumId.get(album.id) ?? 0));
}

async function getStandaloneAlbum(id: string): Promise<AdminAlbumDto> {
  const album = await prisma.album.findUnique({ where: { id }, select: standaloneAlbumSelect });
  if (!album) {
    throw notFound('Album not found');
  }

  const photoCount = await prisma.albumPhoto.count({ where: { albumId: id } });

  return toAdminAlbumDto(album, photoCount);
}

async function getContestAlbum(contestId: string): Promise<AdminAlbumDto> {
  const albums = await listContestAlbums();
  const album = albums.find((entry) => entry.id === contestId);
  if (!album) {
    throw notFound('Contest not found');
  }
  return album;
}

export async function listAdminAlbums(): Promise<AdminAlbumDto[]> {
  const [contestAlbums, standaloneAlbums] = await Promise.all([
    listContestAlbums(),
    listStandaloneAlbums(),
  ]);

  return [...contestAlbums, ...standaloneAlbums].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getAdminAlbum(id: string): Promise<AdminAlbumDto> {
  return getStandaloneAlbum(id);
}

async function pickAlbumSlug(title: string): Promise<string> {
  const base = slugify(title) || FALLBACK_ALBUM_SLUG;
  const existing = await prisma.album.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const taken = new Set<string>([...existing.map((album) => album.slug), ...RESERVED_ALBUM_SLUGS]);

  if (!taken.has(base)) {
    return base;
  }
  for (let suffix = 2; suffix <= taken.size + 2; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  throw conflict('Could not allocate a unique album address');
}

export async function createAdminAlbum(input: CreateAlbumDto): Promise<AdminAlbumDto> {
  const title = input.title.trim();
  const description = input.description?.trim() ?? '';
  const accessCode = input.accessCode?.trim() ?? '';
  assertValidAlbumInput(title, description);

  const album = await prisma.album.create({
    data: {
      slug: await pickAlbumSlug(title),
      title,
      description: description.length > 0 ? description : null,
      accessCode: accessCode.length > 0 ? accessCode : null,
    },
  });

  return getStandaloneAlbum(album.id);
}

export async function updateAdminAlbum(id: string, input: UpdateAlbumDto): Promise<AdminAlbumDto> {
  const existing = await prisma.album.findUnique({ where: { id } });
  if (!existing) {
    throw notFound('Album not found');
  }

  const title = input.title === undefined ? existing.title : input.title.trim();
  const description =
    input.description === undefined ? (existing.description ?? '') : input.description.trim();
  const accessCode =
    input.accessCode === undefined ? (existing.accessCode ?? '') : input.accessCode.trim();
  assertValidAlbumInput(title, description);

  // The slug is left untouched on purpose: links to the album are already in the wild.
  await prisma.album.update({
    where: { id },
    data: {
      title,
      description: description.length > 0 ? description : null,
      accessCode: accessCode.length > 0 ? accessCode : null,
    },
  });

  return getStandaloneAlbum(id);
}

export async function setAdminAlbumVisibility(id: string, hidden: boolean): Promise<AdminAlbumDto> {
  const existing = await prisma.album.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound('Album not found');
  }

  await prisma.album.update({ where: { id }, data: { hidden } });
  return getStandaloneAlbum(id);
}

export async function deleteAdminAlbum(id: string): Promise<void> {
  const album = await prisma.album.findUnique({
    where: { id },
    select: { photos: { select: { filePath: true, previewPath: true, thumbPath: true } } },
  });
  if (!album) {
    throw notFound('Album not found');
  }

  // The DB cascades the photo rows; only the files on disk need explicit cleanup.
  await prisma.album.delete({ where: { id } });

  await removeStoredFiles(
    album.photos.flatMap((photo) => [photo.filePath, photo.previewPath, photo.thumbPath]),
  );
}

export async function setContestAlbumVisibility(
  contestId: string,
  hidden: boolean,
): Promise<AdminAlbumDto> {
  const existing = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true },
  });
  if (!existing) {
    throw notFound('Contest not found');
  }

  await prisma.contest.update({ where: { id: contestId }, data: { hiddenInGallery: hidden } });
  return getContestAlbum(contestId);
}

function toAdminAlbumPhotoDto(photo: AlbumPhoto): AdminAlbumPhotoDto {
  return {
    ...toAlbumPhotoDto(photo),
    firstName: photo.firstName,
    lastName: photo.lastName,
    rulesAcceptedAt: photo.rulesAcceptedAt.toISOString(),
  };
}

async function findAlbumPhoto(albumId: string, photoId: string): Promise<AlbumPhoto> {
  const photo = await prisma.albumPhoto.findFirst({ where: { id: photoId, albumId } });
  if (!photo) {
    throw notFound('Photo not found');
  }
  return photo;
}

export async function listAdminAlbumPhotos(albumId: string): Promise<AdminAlbumPhotoDto[]> {
  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true } });
  if (!album) {
    throw notFound('Album not found');
  }

  const photos = await prisma.albumPhoto.findMany({
    where: { albumId },
    orderBy: { createdAt: 'asc' },
  });

  return photos.map(toAdminAlbumPhotoDto);
}

export async function updateAdminAlbumPhoto(
  albumId: string,
  photoId: string,
  input: UpdateAlbumPhotoDto,
): Promise<AdminAlbumPhotoDto> {
  const existing = await findAlbumPhoto(albumId, photoId);

  const title = input.title === undefined ? existing.title : input.title.trim() || null;
  const description =
    input.description === undefined ? existing.description : input.description.trim() || null;
  assertValidPhotoCaption(title, description);

  const photo = await prisma.albumPhoto.update({
    where: { id: photoId },
    data: { title, description },
  });
  return toAdminAlbumPhotoDto(photo);
}

export async function deleteAdminAlbumPhoto(albumId: string, photoId: string): Promise<void> {
  const photo = await findAlbumPhoto(albumId, photoId);

  await prisma.albumPhoto.delete({ where: { id: photoId } });

  await removeStoredFiles([photo.filePath, photo.previewPath, photo.thumbPath]);
}
