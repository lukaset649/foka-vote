import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { AdminSubmissionDto, ArtworkDto } from '@foka-vote/shared';
import type { Artwork, Submission } from '@prisma/client';
import { notFound } from '../../../errors/app-error.js';
import { prisma } from '../../../lib/prisma.js';
import { MEDIA_URL_PREFIX, UPLOADS_DIR } from '../../../lib/storage.js';

function mediaUrl(storedPath: string): string {
  return `${MEDIA_URL_PREFIX}/${path.basename(storedPath)}`;
}

function toAdminArtworkDto(artwork: Artwork): ArtworkDto {
  return {
    id: artwork.id,
    title: artwork.title,
    description: artwork.description,
    previewUrl: mediaUrl(artwork.previewPath),
    thumbUrl: mediaUrl(artwork.thumbPath),
    width: artwork.width,
    height: artwork.height,
    sortOrder: artwork.sortOrder,
  };
}

function toAdminSubmissionDto(submission: Submission, artworks: Artwork[]): AdminSubmissionDto {
  return {
    id: submission.id,
    alias: submission.alias,
    firstName: submission.firstName,
    lastName: submission.lastName,
    description: submission.description,
    artworks: [...artworks].sort((a, b) => a.sortOrder - b.sortOrder).map(toAdminArtworkDto),
    createdAt: submission.createdAt.toISOString(),
  };
}

async function requireContest(contestId: string): Promise<void> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) {
    throw notFound('Contest not found');
  }
}

async function loadSubmission(
  contestId: string,
  submissionId: string,
): Promise<Submission & { artworks: Artwork[] }> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { artworks: true },
  });
  if (!submission || submission.contestId !== contestId) {
    throw notFound('Submission not found');
  }
  return submission;
}

async function unlinkArtworkFiles(artworks: Artwork[]): Promise<void> {
  await Promise.all(
    artworks.flatMap((artwork) =>
      [artwork.filePath, artwork.previewPath, artwork.thumbPath].map((relativePath) =>
        unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => undefined),
      ),
    ),
  );
}

export async function listAdminSubmissions(contestId: string): Promise<AdminSubmissionDto[]> {
  await requireContest(contestId);

  const submissions = await prisma.submission.findMany({
    where: { contestId },
    include: { artworks: true },
    orderBy: { createdAt: 'asc' },
  });

  return submissions.map((submission) => toAdminSubmissionDto(submission, submission.artworks));
}

export async function getAdminSubmission(
  contestId: string,
  submissionId: string,
): Promise<AdminSubmissionDto> {
  const submission = await loadSubmission(contestId, submissionId);
  return toAdminSubmissionDto(submission, submission.artworks);
}

export async function deleteSubmission(contestId: string, submissionId: string): Promise<void> {
  const submission = await loadSubmission(contestId, submissionId);
  await prisma.submission.delete({ where: { id: submission.id } });
  await unlinkArtworkFiles(submission.artworks);
}
