import type { ContestDto } from '@foka-vote/shared';
import type { Contest } from '@prisma/client';
import { notFound } from '../../errors/app-error.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import { prisma } from '../../lib/prisma.js';

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

export async function getPublicContestBySlug(slug: string): Promise<ContestDto> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }
  return toPublicContestDto(contest);
}
