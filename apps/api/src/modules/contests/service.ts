import type { ContestDto, PublicContestListDto } from '@foka-vote/shared';
import type { Contest } from '../../generated/prisma/client.js';
import { badRequest, notFound, unauthorized } from '../../errors/app-error.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import type { ParsedListQuery } from '../../lib/list-query.js';
import { paginateKeys, titleSearchFilter } from '../../lib/list-query.js';
import { prisma } from '../../lib/prisma.js';

export const CONTEST_ACCESS_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function contestAccessCookieName(contestId: string): string {
  return `contest_access_${contestId}`;
}

export function assertContestAccess(
  contest: Contest,
  signedCookies: Record<string, string | undefined>,
): void {
  if (contest.accessCode === null) {
    return;
  }
  const cookieValue = signedCookies[contestAccessCookieName(contest.id)];
  if (cookieValue !== contest.accessCode) {
    throw unauthorized('Access code required');
  }
}

function toPublicContestDto(contest: Contest): ContestDto {
  const status = computeContestStatus(new Date(), contest);

  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    description: contest.description,
    submissionStart: contest.submissionStart.toISOString(),
    submissionDeadline: contest.submissionDeadline.toISOString(),
    votingStart: contest.votingStart.toISOString(),
    votingEnd: contest.votingEnd.toISOString(),
    maxArtworksPerSubmission: contest.maxArtworksPerSubmission,
    status,
    hasAccessCode: contest.accessCode !== null,
    createdAt: contest.createdAt.toISOString(),
  };
}

/**
 * Current contests (open for submissions or voting) are returned in full and never searched or
 * paginated; only the remaining contests are. The date filters mirror `computeContestStatus`.
 */
export async function listPublicContests(
  listQuery: ParsedListQuery,
): Promise<PublicContestListDto> {
  const now = new Date();

  const [current, otherKeys] = await Promise.all([
    prisma.contest.findMany({
      where: { submissionStart: { lte: now }, votingEnd: { gt: now } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contest.findMany({
      where: {
        OR: [{ submissionStart: { gt: now } }, { votingEnd: { lte: now } }],
        ...titleSearchFilter(listQuery.q),
      },
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  const page = paginateKeys(otherKeys, listQuery);
  const pageContests = await prisma.contest.findMany({
    where: { id: { in: page.items.map((key) => key.id) } },
  });
  const contestById = new Map(pageContests.map((contest) => [contest.id, contest]));

  return {
    current: current.map(toPublicContestDto),
    others: {
      ...page,
      items: page.items.flatMap((key) => {
        const contest = contestById.get(key.id);
        return contest ? [toPublicContestDto(contest)] : [];
      }),
    },
  };
}

export async function getPublicContestBySlug(slug: string): Promise<ContestDto> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }
  return toPublicContestDto(contest);
}

export async function verifyContestAccessCode(
  slug: string,
  code: string,
): Promise<{ contestId: string }> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }
  if (contest.accessCode === null) {
    throw badRequest('This contest does not require an access code');
  }
  if (code !== contest.accessCode) {
    throw unauthorized('Invalid access code');
  }
  return { contestId: contest.id };
}
