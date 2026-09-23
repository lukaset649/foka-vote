import type { AdminAlbumDto, ModerationStatus, UpdateAlbumDto } from '@foka-vote/shared';
import { notFound } from '../../../errors/app-error.js';
import { prisma } from '../../../lib/prisma.js';
import { mediaUrl, removeStoredFiles } from '../../../lib/storage.js';
import { assertValidAlbumInput } from '../../gallery/service.js';

const standaloneAlbumSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  createdAt: true,
  status: true,
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
  status: ModerationStatus;
  hidden: boolean;
  photos: { thumbPath: string }[];
}

interface StatusCount {
  status: ModerationStatus;
  count: number;
}

function toAdminAlbumDto(album: StandaloneAlbumRow, counts: StatusCount[]): AdminAlbumDto {
  const coverThumbPath = album.photos[0]?.thumbPath;

  return {
    kind: 'STANDALONE',
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    createdAt: album.createdAt.toISOString(),
    status: album.status,
    hidden: album.hidden,
    photoCount: counts.reduce((total, entry) => total + entry.count, 0),
    pendingPhotoCount: counts.find((entry) => entry.status === 'PENDING')?.count ?? 0,
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
      // The contest itself is the moderation record; only visibility is steerable here.
      status: 'APPROVED',
      hidden: contest.hiddenInGallery,
      photoCount: countByContestId.get(contest.id) ?? 0,
      pendingPhotoCount: 0,
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
    by: ['albumId', 'status'],
    _count: { _all: true },
  });

  return albums.map((album) =>
    toAdminAlbumDto(
      album,
      photoCounts
        .filter((entry) => entry.albumId === album.id)
        .map((entry) => ({ status: entry.status, count: entry._count._all })),
    ),
  );
}

async function getStandaloneAlbum(id: string): Promise<AdminAlbumDto> {
  const album = await prisma.album.findUnique({ where: { id }, select: standaloneAlbumSelect });
  if (!album) {
    throw notFound('Album not found');
  }

  const counts = await prisma.albumPhoto.groupBy({
    by: ['status'],
    where: { albumId: id },
    _count: { _all: true },
  });

  return toAdminAlbumDto(
    album,
    counts.map((entry) => ({ status: entry.status, count: entry._count._all })),
  );
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

export async function updateAdminAlbum(id: string, input: UpdateAlbumDto): Promise<AdminAlbumDto> {
  const existing = await prisma.album.findUnique({ where: { id } });
  if (!existing) {
    throw notFound('Album not found');
  }

  const title = input.title === undefined ? existing.title : input.title.trim();
  const description =
    input.description === undefined ? (existing.description ?? '') : input.description.trim();
  assertValidAlbumInput(title, description);

  // The slug is left untouched on purpose: links to the album are already in the wild.
  await prisma.album.update({
    where: { id },
    data: { title, description: description.length > 0 ? description : null },
  });

  return getStandaloneAlbum(id);
}

export async function setAdminAlbumStatus(
  id: string,
  status: ModerationStatus,
): Promise<AdminAlbumDto> {
  const existing = await prisma.album.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound('Album not found');
  }

  await prisma.album.update({ where: { id }, data: { status } });
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
