import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { ArtworkDto, SubmissionDto } from '@foka-vote/shared';
import type { Artwork, Submission } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { contestAccessCookieName } from '../contests/service.js';
import { badRequest, conflict, notFound, unauthorized } from '../../errors/app-error.js';
import type { ArtworkImageResult } from '../../lib/artwork-image.js';
import { processArtworkImage } from '../../lib/artwork-image.js';
import { computeContestStatus } from '../../lib/contest-status.js';
import { pickAvailableAlias } from '../../lib/nickname.js';
import { prisma } from '../../lib/prisma.js';
import { MEDIA_URL_PREFIX, UPLOADS_DIR } from '../../lib/storage.js';

const MAX_ALIAS_ATTEMPTS = 3;

export interface CreateSubmissionInput {
  firstName: string;
  lastName: string;
  description?: string;
}

export interface ArtworkMetaInput {
  title?: string;
  description?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function mediaUrl(storedPath: string): string {
  return `${MEDIA_URL_PREFIX}/${path.basename(storedPath)}`;
}

function toArtworkDto(artwork: Artwork): ArtworkDto {
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

function toSubmissionDto(submission: Submission, artworks: Artwork[]): SubmissionDto {
  return {
    id: submission.id,
    alias: submission.alias,
    description: submission.description,
    artworks: [...artworks].sort((a, b) => a.sortOrder - b.sortOrder).map(toArtworkDto),
    createdAt: submission.createdAt.toISOString(),
  };
}

async function cleanupProcessedFiles(processed: ArtworkImageResult[]): Promise<void> {
  await Promise.all(
    processed.flatMap((file) =>
      [file.filePath, file.previewPath, file.thumbPath].map((relativePath) =>
        unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => undefined),
      ),
    ),
  );
}

async function createSubmissionWithRetry(
  contestId: string,
  input: CreateSubmissionInput,
  processed: ArtworkImageResult[],
  meta: ArtworkMetaInput[],
): Promise<{ submission: Submission; artworks: Artwork[] }> {
  for (let attempt = 0; attempt < MAX_ALIAS_ATTEMPTS; attempt++) {
    const existing = await prisma.submission.findMany({
      where: { contestId },
      select: { alias: true },
    });
    const alias = pickAvailableAlias(existing.map((submission) => submission.alias));
    if (alias === null) {
      throw conflict('This contest has reached its submission limit');
    }

    try {
      // eslint-disable-next-line no-await-in-loop -- each attempt depends on the previous one's outcome
      return await prisma.$transaction(async (tx) => {
        const submission = await tx.submission.create({
          data: {
            contestId,
            firstName: input.firstName,
            lastName: input.lastName,
            description: input.description ?? null,
            alias,
          },
        });

        const artworks: Artwork[] = [];
        for (let i = 0; i < processed.length; i++) {
          const file = processed[i] as ArtworkImageResult;
          const fileMeta = meta[i];
          // eslint-disable-next-line no-await-in-loop -- artwork rows must be created in order for sortOrder
          const artwork = await tx.artwork.create({
            data: {
              submissionId: submission.id,
              title: fileMeta?.title ?? null,
              description: fileMeta?.description ?? null,
              filePath: file.filePath,
              previewPath: file.previewPath,
              thumbPath: file.thumbPath,
              width: file.width,
              height: file.height,
              sortOrder: i,
            },
          });
          artworks.push(artwork);
        }

        return { submission, artworks };
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < MAX_ALIAS_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  throw conflict('Could not allocate a unique nickname, please try again');
}

export async function listSubmissions(slug: string): Promise<SubmissionDto[]> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }

  const submissions = await prisma.submission.findMany({
    where: { contestId: contest.id },
    include: { artworks: true },
    orderBy: { createdAt: 'asc' },
  });

  return submissions.map((submission) => toSubmissionDto(submission, submission.artworks));
}

export async function createSubmission(
  slug: string,
  input: CreateSubmissionInput,
  files: Express.Multer.File[],
  meta: ArtworkMetaInput[],
  signedCookies: Record<string, string | undefined>,
): Promise<SubmissionDto> {
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) {
    throw notFound('Contest not found');
  }

  const status = computeContestStatus(new Date(), contest);
  if (status !== 'SUBMISSIONS') {
    throw conflict('This contest is not currently accepting submissions');
  }

  if (contest.accessCode !== null) {
    const cookieValue = signedCookies[contestAccessCookieName(contest.id)];
    if (cookieValue !== contest.accessCode) {
      throw unauthorized('Access code required');
    }
  }

  if (files.length < 1 || files.length > contest.maxArtworksPerSubmission) {
    throw badRequest(
      `Submission must include between 1 and ${contest.maxArtworksPerSubmission} artworks`,
    );
  }

  if (meta.length !== files.length) {
    throw badRequest('artworks metadata length must match the number of uploaded files');
  }

  const settled = await Promise.allSettled(files.map((file) => processArtworkImage(file.buffer)));

  const processed: ArtworkImageResult[] = [];
  let firstError: unknown;
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      processed.push(result.value);
    } else if (firstError === undefined) {
      firstError = result.reason;
    }
  }

  if (firstError !== undefined) {
    await cleanupProcessedFiles(processed);
    throw firstError;
  }

  try {
    const { submission, artworks } = await createSubmissionWithRetry(
      contest.id,
      input,
      processed,
      meta,
    );
    return toSubmissionDto(submission, artworks);
  } catch (error) {
    await cleanupProcessedFiles(processed);
    throw error;
  }
}
