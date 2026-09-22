import type { GalleryAlbumDto } from '@foka-vote/shared';
import { GALLERY_ALBUM_PREVIEW_COUNT } from '@foka-vote/shared';
import { prisma } from '../../lib/prisma.js';
import { mediaUrl } from '../../lib/storage.js';
import { contestAccessCookieName } from '../contests/service.js';

type SignedCookies = Record<string, string | undefined>;

function isContestUnlocked(
  contest: { id: string; accessCode: string | null },
  signedCookies: SignedCookies,
): boolean {
  return (
    contest.accessCode === null ||
    signedCookies[contestAccessCookieName(contest.id)] === contest.accessCode
  );
}

/**
 * Contest albums have no rows of their own — they are projected from the contests, so the
 * album's title, description and date always come straight from the contest itself.
 */
async function listContestAlbums(signedCookies: SignedCookies): Promise<GalleryAlbumDto[]> {
  const contests = await prisma.contest.findMany({
    where: { hiddenInGallery: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      accessCode: true,
      createdAt: true,
      // One thumbnail per submission, mirroring the preview on the contest page.
      submissions: {
        orderBy: { createdAt: 'asc' },
        take: GALLERY_ALBUM_PREVIEW_COUNT,
        select: {
          artworks: { orderBy: { sortOrder: 'asc' }, take: 1, select: { thumbPath: true } },
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

  return contests.map((contest) => {
    // A contest behind an access code must not leak its works before the code is entered.
    const locked = !isContestUnlocked(contest, signedCookies);

    return {
      kind: 'CONTEST',
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      description: contest.description,
      createdAt: contest.createdAt.toISOString(),
      locked,
      itemCount: locked ? 0 : (countByContestId.get(contest.id) ?? 0),
      previewThumbUrls: locked
        ? []
        : contest.submissions.flatMap((submission) =>
            submission.artworks.map((artwork) => mediaUrl(artwork.thumbPath)),
          ),
    };
  });
}

async function listStandaloneAlbums(): Promise<GalleryAlbumDto[]> {
  const albums = await prisma.album.findMany({
    where: { status: 'APPROVED', hidden: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      photos: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'asc' },
        take: GALLERY_ALBUM_PREVIEW_COUNT,
        select: { thumbPath: true },
      },
      _count: { select: { photos: { where: { status: 'APPROVED' } } } },
    },
  });

  return albums.map((album) => ({
    kind: 'STANDALONE',
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    createdAt: album.createdAt.toISOString(),
    locked: false,
    itemCount: album._count.photos,
    previewThumbUrls: album.photos.map((photo) => mediaUrl(photo.thumbPath)),
  }));
}

export async function listGalleryAlbums(signedCookies: SignedCookies): Promise<GalleryAlbumDto[]> {
  const [contestAlbums, standaloneAlbums] = await Promise.all([
    listContestAlbums(signedCookies),
    listStandaloneAlbums(),
  ]);

  // Both sides produce ISO-8601 UTC timestamps, which sort chronologically as strings.
  return [...contestAlbums, ...standaloneAlbums].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
