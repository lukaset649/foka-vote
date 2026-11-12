import type { ContestStatus } from '@foka-vote/shared';
import type {
  Album,
  AlbumPhoto,
  AlbumSubmission,
  Contest,
  ContestTopic,
  Submission,
  VoteCard,
} from '../src/generated/prisma/client.js';
import { prisma } from '../src/lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const PHASE_DAY_OFFSETS: Record<ContestStatus, [number, number, number, number]> = {
  DRAFT: [1, 2, 3, 4],
  SUBMISSIONS: [-1, 1, 2, 3],
  VOTING: [-3, -2, -1, 1],
  CLOSED: [-4, -3, -2, -1],
};

let sequence = 0;

function nextId(): number {
  sequence += 1;
  return sequence;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

export interface ContestOverrides {
  phase?: ContestStatus;
  slug?: string;
  title?: string;
  description?: string | null;
  maxArtworksPerSubmission?: number;
  accessCode?: string | null;
  hiddenInGallery?: boolean;
  createdAt?: Date;
}

export function createContest(overrides: ContestOverrides = {}): Promise<Contest> {
  const { phase = 'SUBMISSIONS', ...fields } = overrides;
  const [submissionStart, submissionDeadline, votingStart, votingEnd] = PHASE_DAY_OFFSETS[phase];
  const id = nextId();

  return prisma.contest.create({
    data: {
      slug: `contest-${id}`,
      title: `Contest ${id}`,
      submissionStart: daysFromNow(submissionStart),
      submissionDeadline: daysFromNow(submissionDeadline),
      votingStart: daysFromNow(votingStart),
      votingEnd: daysFromNow(votingEnd),
      status: phase,
      ...fields,
    },
  });
}

export interface SubmissionOverrides {
  firstName?: string;
  lastName?: string;
  alias?: string;
  description?: string | null;
  artworkCount?: number;
}

export function createSubmission(
  contestId: string,
  overrides: SubmissionOverrides = {},
): Promise<Submission> {
  const { artworkCount = 1, ...fields } = overrides;
  const id = nextId();

  return prisma.submission.create({
    data: {
      contestId,
      firstName: 'Jan',
      lastName: `Kowalski ${id}`,
      alias: `alias-${id}`,
      rulesAcceptedAt: new Date(),
      ...fields,
      artworks: {
        create: Array.from({ length: artworkCount }, (_, index) => ({
          title: `Artwork ${id}-${index + 1}`,
          filePath: `originals/artwork-${id}-${index}.jpg`,
          previewPath: `variants/artwork-${id}-${index}-preview.webp`,
          thumbPath: `variants/artwork-${id}-${index}-thumb.webp`,
          width: 64,
          height: 48,
          sortOrder: index,
        })),
      },
    },
  });
}

export interface VotePick {
  submissionId: string;
  points: number;
}

export function createVoteCard(
  contestId: string,
  picks: VotePick[],
  overrides: { isVoid?: boolean; voidReason?: string | null } = {},
): Promise<VoteCard> {
  return prisma.voteCard.create({
    data: {
      contestId,
      ...overrides,
      items: { create: picks },
    },
  });
}

export interface AlbumOverrides {
  slug?: string;
  title?: string;
  description?: string | null;
  accessCode?: string | null;
  hidden?: boolean;
  createdAt?: Date;
}

export function createAlbum(overrides: AlbumOverrides = {}): Promise<Album> {
  const id = nextId();

  return prisma.album.create({
    data: {
      slug: `album-${id}`,
      title: `Album ${id}`,
      ...overrides,
    },
  });
}

export function createAlbumSubmission(
  albumId: string,
  overrides: { firstName?: string; lastName?: string; photoCount?: number } = {},
): Promise<AlbumSubmission & { photos: AlbumPhoto[] }> {
  const { photoCount = 1, ...fields } = overrides;
  const id = nextId();

  return prisma.albumSubmission.create({
    data: {
      albumId,
      firstName: 'Anna',
      lastName: `Nowak ${id}`,
      rulesAcceptedAt: new Date(),
      ...fields,
      photos: {
        create: Array.from({ length: photoCount }, (_, index) => ({
          title: `Photo ${id}-${index + 1}`,
          filePath: `originals/photo-${id}-${index}.jpg`,
          previewPath: `variants/photo-${id}-${index}-preview.webp`,
          thumbPath: `variants/photo-${id}-${index}-thumb.webp`,
          width: 64,
          height: 48,
          sortOrder: index,
        })),
      },
    },
    include: { photos: true },
  });
}

export function createTopic(title?: string): Promise<ContestTopic> {
  return prisma.contestTopic.create({
    data: { title: title ?? `Topic ${nextId()}` },
  });
}
