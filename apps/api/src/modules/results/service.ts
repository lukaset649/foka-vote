import type { ResultEntryDto, ResultsDto } from '@foka-vote/shared';
import { assertContestAccess } from '../contests/service.js';
import { conflict, notFound } from '../../errors/app-error.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import { prisma } from '../../lib/prisma.js';

interface ScoredSubmission {
  submissionId: string;
  alias: string;
  firstName: string;
  lastName: string;
  total: number;
  votes3: number;
  votes2: number;
  votes1: number;
}

function compareByNameThenTotal(a: ScoredSubmission, b: ScoredSubmission): number {
  if (a.total !== b.total) {
    return b.total - a.total;
  }
  const lastNameCompare = a.lastName.localeCompare(b.lastName, 'pl');
  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }
  return a.firstName.localeCompare(b.firstName, 'pl');
}

function assignPlaces(sorted: ScoredSubmission[]): ResultEntryDto[] {
  const results: ResultEntryDto[] = [];
  let place = 0;
  let previousTotal: number | null = null;

  for (const entry of sorted) {
    if (previousTotal === null || entry.total !== previousTotal) {
      place += 1;
      previousTotal = entry.total;
    }
    results.push({ ...entry, place });
  }

  return results;
}

export async function getContestResults(
  slug: string,
  signedCookies: Record<string, string | undefined>,
): Promise<ResultsDto> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }

  assertContestAccess(contest, signedCookies);

  const status = computeContestStatus(new Date(), contest);
  if (status !== 'CLOSED') {
    throw conflict('Results are not available until this contest has closed');
  }

  const submissions = await prisma.submission.findMany({
    where: { contestId: contest.id },
    select: {
      id: true,
      alias: true,
      firstName: true,
      lastName: true,
      votes: {
        where: { voteCard: { isVoid: false } },
        select: { points: true },
      },
    },
  });

  const scored: ScoredSubmission[] = submissions.map((submission) => {
    const total = submission.votes.reduce((sum, vote) => sum + vote.points, 0);
    return {
      submissionId: submission.id,
      alias: submission.alias,
      firstName: submission.firstName,
      lastName: submission.lastName,
      total,
      votes3: submission.votes.filter((vote) => vote.points === 3).length,
      votes2: submission.votes.filter((vote) => vote.points === 2).length,
      votes1: submission.votes.filter((vote) => vote.points === 1).length,
    };
  });

  scored.sort(compareByNameThenTotal);

  const voteCardCount = await prisma.voteCard.count({
    where: { contestId: contest.id, isVoid: false },
  });

  return { results: assignPlaces(scored), voteCardCount };
}
