import type { CreateAlbumDto, GalleryAlbumDto } from '@foka-vote/shared';
import {
  GALLERY_ALBUM_PREVIEW_COUNT,
  MAX_ALBUM_DESCRIPTION_LENGTH,
  MAX_ALBUM_TITLE_LENGTH,
  RESERVED_ALBUM_SLUGS,
} from '@foka-vote/shared';
import { Prisma } from '@prisma/client';
import { badRequest, conflict } from '../../errors/app-error.js';
import { prisma } from '../../lib/prisma.js';
import { slugify } from '../../lib/slugify.js';
import { mediaUrl } from '../../lib/storage.js';
import { contestAccessCookieName } from '../contests/service.js';

type SignedCookies = Record<string, string | undefined>;

// Titles such as "???" slugify to an empty string, which is not a usable route segment.
const FALLBACK_ALBUM_SLUG = 'album';
const MAX_SLUG_ATTEMPTS = 3;

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

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function assertValidAlbumInput(title: string, description: string): void {
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

/**
 * Albums are created by anonymous visitors, so a title someone else already used must not
 * surface as an error — the slug just gets a numeric suffix instead.
 */
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
  throw conflict('Could not allocate a unique album address, please try again');
}

export async function createAlbum(input: CreateAlbumDto): Promise<void> {
  const title = input.title.trim();
  const description = input.description?.trim() ?? '';
  assertValidAlbumInput(title, description);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    // eslint-disable-next-line no-await-in-loop -- each attempt depends on the previous one's outcome
    const slug = await pickAlbumSlug(title);

    try {
      // eslint-disable-next-line no-await-in-loop -- see above
      await prisma.album.create({
        data: {
          slug,
          title,
          description: description.length > 0 ? description : null,
          status: 'PENDING',
        },
      });
      return;
    } catch (error) {
      // Two visitors submitting the same title at the same time race for the slug.
      if (isUniqueConstraintError(error) && attempt < MAX_SLUG_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  throw conflict('Could not allocate a unique album address, please try again');
}
