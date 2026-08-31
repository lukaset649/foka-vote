import type { ContestDto } from '@foka-vote/shared';
import type { Contest } from '@prisma/client';
import { badRequest, notFound, unauthorized } from '../../errors/app-error.js';
import { computeContestStatus } from '../../lib/contest-status.js';
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

export async function listPublicContests(): Promise<ContestDto[]> {
  const contests = await prisma.contest.findMany({ orderBy: { createdAt: 'desc' } });
  return contests.map(toPublicContestDto);
}

export async function getPublicContestBySlug(
  slug: string,
  signedCookies: Record<string, string | undefined>,
): Promise<ContestDto> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }
  assertContestAccess(contest, signedCookies);
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
