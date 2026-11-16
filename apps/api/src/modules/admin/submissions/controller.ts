import type { Request, Response } from 'express';
import type { UpdateArtworkDto, UpdateSubmissionDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import {
  parseOptionalText,
  parseRequiredText,
  requireObjectBody,
} from '../../../lib/request-body.js';
import { requireParam } from '../../../lib/request-params.js';
import {
  deleteArtwork,
  deleteSubmission,
  getAdminSubmission,
  listAdminSubmissions,
  replaceArtwork,
  reorderArtworks,
  updateArtwork,
  updateSubmission,
} from './service.js';

function parseUpdateSubmissionBody(rawBody: unknown): UpdateSubmissionDto {
  const body = requireObjectBody(rawBody);
  const result: UpdateSubmissionDto = {};

  if (body.firstName !== undefined) {
    result.firstName = parseRequiredText(body.firstName, 'firstName');
  }
  if (body.lastName !== undefined) {
    result.lastName = parseRequiredText(body.lastName, 'lastName');
  }
  const description = parseOptionalText(body.description, 'description');
  if (description !== undefined) {
    result.description = description;
  }

  return result;
}

function parseUpdateArtworkBody(rawBody: unknown): UpdateArtworkDto {
  const body = requireObjectBody(rawBody);
  const result: UpdateArtworkDto = {};

  const title = parseOptionalText(body.title, 'title');
  if (title !== undefined) {
    result.title = title;
  }
  const description = parseOptionalText(body.description, 'description');
  if (description !== undefined) {
    result.description = description;
  }

  return result;
}

function parseOrderBody(body: unknown): string[] {
  const input = (body ?? {}) as Record<string, unknown>;
  const { order } = input;
  if (
    !Array.isArray(order) ||
    order.length === 0 ||
    !order.every((id): id is string => typeof id === 'string' && id.length > 0)
  ) {
    throw badRequest('order must be a non-empty array of artwork ids');
  }
  return order;
}

export async function list(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissions = await listAdminSubmissions(contestId);
  response.json(submissions);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  const submission = await getAdminSubmission(contestId, submissionId);
  response.json(submission);
}

export async function remove(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  await deleteSubmission(contestId, submissionId);
  response.status(204).end();
}

export async function update(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  const input = parseUpdateSubmissionBody(request.body);
  const submission = await updateSubmission(contestId, submissionId, input);
  response.json(submission);
}

export async function updateArtworkTitle(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  const artworkId = requireParam(request, 'artworkId');
  const input = parseUpdateArtworkBody(request.body);
  const submission = await updateArtwork(contestId, submissionId, artworkId, input);
  response.json(submission);
}

export async function removeArtwork(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  const artworkId = requireParam(request, 'artworkId');
  const submission = await deleteArtwork(contestId, submissionId, artworkId);
  response.json(submission);
}

export async function reorder(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  const order = parseOrderBody(request.body);
  const submission = await reorderArtworks(contestId, submissionId, order);
  response.json(submission);
}

export async function replace(request: Request, response: Response): Promise<void> {
  const contestId = requireParam(request, 'contestId');
  const submissionId = requireParam(request, 'submissionId');
  const artworkId = requireParam(request, 'artworkId');
  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  const file = files[0];
  if (!file) {
    throw badRequest('artwork file is required');
  }
  const submission = await replaceArtwork(contestId, submissionId, artworkId, file.buffer);
  response.json(submission);
}
