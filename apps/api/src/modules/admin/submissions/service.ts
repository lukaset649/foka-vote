import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type {
  AdminSubmissionDto,
  ArtworkDto,
  UpdateArtworkDto,
  UpdateSubmissionDto,
} from '@foka-vote/shared';
import type { Artwork, Submission } from '@prisma/client';
import { badRequest, conflict, notFound } from '../../../errors/app-error.js';
import { processArtworkImage } from '../../../lib/artwork-image.js';
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
    fullUrl: mediaUrl(artwork.filePath),
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

function findArtwork(submission: Submission & { artworks: Artwork[] }, artworkId: string): Artwork {
  const artwork = submission.artworks.find((candidate) => candidate.id === artworkId);
  if (!artwork) {
    throw notFound('Artwork not found');
  }
  return artwork;
}

async function unlinkRelativePaths(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((relativePath) =>
      unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => undefined),
    ),
  );
}

async function unlinkArtworkFiles(artworks: Artwork[]): Promise<void> {
  await unlinkRelativePaths(
    artworks.flatMap((artwork) => [artwork.filePath, artwork.previewPath, artwork.thumbPath]),
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

export async function updateSubmission(
  contestId: string,
  submissionId: string,
  input: UpdateSubmissionDto,
): Promise<AdminSubmissionDto> {
  const existing = await loadSubmission(contestId, submissionId);

  const submission = await prisma.submission.update({
    where: { id: existing.id },
    data: {
      firstName: input.firstName ?? existing.firstName,
      lastName: input.lastName ?? existing.lastName,
      description: input.description !== undefined ? input.description : existing.description,
    },
  });

  return toAdminSubmissionDto(submission, existing.artworks);
}

export async function updateArtwork(
  contestId: string,
  submissionId: string,
  artworkId: string,
  input: UpdateArtworkDto,
): Promise<AdminSubmissionDto> {
  const submission = await loadSubmission(contestId, submissionId);
  const artwork = findArtwork(submission, artworkId);

  await prisma.artwork.update({
    where: { id: artwork.id },
    data: {
      title: input.title !== undefined ? input.title : artwork.title,
      description: input.description !== undefined ? input.description : artwork.description,
    },
  });

  return getAdminSubmission(contestId, submissionId);
}

export async function deleteArtwork(
  contestId: string,
  submissionId: string,
  artworkId: string,
): Promise<AdminSubmissionDto> {
  const submission = await loadSubmission(contestId, submissionId);
  const artwork = findArtwork(submission, artworkId);

  if (submission.artworks.length <= 1) {
    throw conflict(
      'A submission must keep at least one artwork; delete the whole submission instead',
    );
  }

  await prisma.artwork.delete({ where: { id: artwork.id } });
  await unlinkArtworkFiles([artwork]);

  return getAdminSubmission(contestId, submissionId);
}

export async function reorderArtworks(
  contestId: string,
  submissionId: string,
  order: string[],
): Promise<AdminSubmissionDto> {
  const submission = await loadSubmission(contestId, submissionId);

  const existingIds = new Set(submission.artworks.map((artwork) => artwork.id));
  const orderIds = new Set(order);
  const isExactMatch =
    order.length === submission.artworks.length &&
    orderIds.size === order.length &&
    [...orderIds].every((id) => existingIds.has(id));

  if (!isExactMatch) {
    throw badRequest('order must contain exactly the artwork ids of this submission, each once');
  }

  await prisma.$transaction(
    order.map((artworkId, index) =>
      prisma.artwork.update({ where: { id: artworkId }, data: { sortOrder: index } }),
    ),
  );

  return getAdminSubmission(contestId, submissionId);
}

export async function replaceArtwork(
  contestId: string,
  submissionId: string,
  artworkId: string,
  file: Buffer,
): Promise<AdminSubmissionDto> {
  const submission = await loadSubmission(contestId, submissionId);
  const artwork = findArtwork(submission, artworkId);

  const processed = await processArtworkImage(file);

  try {
    await prisma.artwork.update({
      where: { id: artwork.id },
      data: {
        filePath: processed.filePath,
        previewPath: processed.previewPath,
        thumbPath: processed.thumbPath,
        width: processed.width,
        height: processed.height,
      },
    });
  } catch (error) {
    await unlinkRelativePaths([processed.filePath, processed.previewPath, processed.thumbPath]);
    throw error;
  }

  await unlinkRelativePaths([artwork.filePath, artwork.previewPath, artwork.thumbPath]);

  return getAdminSubmission(contestId, submissionId);
}
