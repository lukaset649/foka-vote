import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_MAX_ARTWORKS_PER_SUBMISSION } from '@foka-vote/shared';
import type { AdminContestDto, CreateContestDto, UpdateContestDto } from '@foka-vote/shared';
import type { Contest } from '@prisma/client';
import { badRequest, conflict, notFound } from '../../../errors/app-error.js';
import { computeContestStatus } from '../../../lib/contest-status.js';
import { prisma } from '../../../lib/prisma.js';
import { slugify } from '../../../lib/slugify.js';
import { UPLOADS_DIR } from '../../../lib/storage.js';

function toAdminContestDto(contest: Contest): AdminContestDto {
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
    accessCode: contest.accessCode,
    createdAt: contest.createdAt.toISOString(),
  };
}

interface ContestDateInput {
  submissionStart: Date;
  submissionDeadline: Date;
  votingStart: Date;
  votingEnd: Date;
}

function assertValidDateOrder(dates: ContestDateInput): void {
  const { submissionStart, submissionDeadline, votingStart, votingEnd } = dates;

  if (
    Number.isNaN(submissionStart.getTime()) ||
    Number.isNaN(submissionDeadline.getTime()) ||
    Number.isNaN(votingStart.getTime()) ||
    Number.isNaN(votingEnd.getTime())
  ) {
    throw badRequest('Invalid date value');
  }
  if (submissionStart >= submissionDeadline) {
    throw badRequest('submissionStart must be before submissionDeadline');
  }
  if (submissionDeadline > votingStart) {
    throw badRequest('submissionDeadline must be at or before votingStart');
  }
  if (votingStart >= votingEnd) {
    throw badRequest('votingStart must be before votingEnd');
  }
}

async function ensureUniqueSlug(slug: string, excludeId?: string): Promise<void> {
  const existing = await prisma.contest.findUnique({ where: { slug } });
  if (existing && existing.id !== excludeId) {
    throw conflict(`Slug "${slug}" is already in use`);
  }
}

export async function createContest(input: CreateContestDto): Promise<AdminContestDto> {
  const slug = input.slug ?? slugify(input.title);
  await ensureUniqueSlug(slug);

  const submissionStart = new Date(input.submissionStart);
  const submissionDeadline = new Date(input.submissionDeadline);
  const votingStart = new Date(input.votingStart);
  const votingEnd = new Date(input.votingEnd);
  assertValidDateOrder({ submissionStart, submissionDeadline, votingStart, votingEnd });

  const contest = await prisma.contest.create({
    data: {
      slug,
      title: input.title,
      description: input.description ?? null,
      submissionStart,
      submissionDeadline,
      votingStart,
      votingEnd,
      maxArtworksPerSubmission:
        input.maxArtworksPerSubmission ?? DEFAULT_MAX_ARTWORKS_PER_SUBMISSION,
      accessCode: input.accessCode ?? null,
    },
  });

  return toAdminContestDto(contest);
}

export async function listContests(): Promise<AdminContestDto[]> {
  const contests = await prisma.contest.findMany({ orderBy: { createdAt: 'desc' } });
  return contests.map(toAdminContestDto);
}

export async function getContestById(id: string): Promise<AdminContestDto> {
  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) {
    throw notFound('Contest not found');
  }
  return toAdminContestDto(contest);
}

export async function updateContest(id: string, input: UpdateContestDto): Promise<AdminContestDto> {
  const existing = await prisma.contest.findUnique({ where: { id } });
  if (!existing) {
    throw notFound('Contest not found');
  }

  const submissionStart = input.submissionStart
    ? new Date(input.submissionStart)
    : existing.submissionStart;
  const submissionDeadline = input.submissionDeadline
    ? new Date(input.submissionDeadline)
    : existing.submissionDeadline;
  const votingStart = input.votingStart ? new Date(input.votingStart) : existing.votingStart;
  const votingEnd = input.votingEnd ? new Date(input.votingEnd) : existing.votingEnd;
  assertValidDateOrder({ submissionStart, submissionDeadline, votingStart, votingEnd });

  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    await ensureUniqueSlug(input.slug, id);
    slug = input.slug;
  }

  const contest = await prisma.contest.update({
    where: { id },
    data: {
      slug,
      title: input.title ?? existing.title,
      description: input.description !== undefined ? input.description : existing.description,
      submissionStart,
      submissionDeadline,
      votingStart,
      votingEnd,
      maxArtworksPerSubmission: input.maxArtworksPerSubmission ?? existing.maxArtworksPerSubmission,
      accessCode: input.accessCode !== undefined ? input.accessCode : existing.accessCode,
    },
  });

  return toAdminContestDto(contest);
}

export async function deleteContest(id: string): Promise<void> {
  const existing = await prisma.contest.findUnique({ where: { id } });
  if (!existing) {
    throw notFound('Contest not found');
  }

  const artworks = await prisma.artwork.findMany({
    where: { submission: { contestId: id } },
    select: { filePath: true, previewPath: true, thumbPath: true },
  });

  // The DB cascades submissions, artworks, vote cards and vote items; only the
  // files on disk need explicit cleanup.
  await prisma.contest.delete({ where: { id } });

  await Promise.all(
    artworks
      .flatMap((artwork) => [artwork.filePath, artwork.previewPath, artwork.thumbPath])
      .map((relativePath) => unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => undefined)),
  );
}
