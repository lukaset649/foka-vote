import type { Request, Response } from 'express';
import type { UpdateArtworkDto, UpdateSubmissionDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import {
  deleteArtwork,
  deleteSubmission,
  getAdminSubmission,
  listAdminSubmissions,
  reorderArtworks,
  updateArtwork,
  updateSubmission,
} from './service.js';

function requireContestIdParam(request: Request): string {
  const { contestId } = request.params;
  if (typeof contestId !== 'string' || contestId.length === 0) {
    throw badRequest('contestId is required');
  }
  return contestId;
}

function requireSubmissionIdParam(request: Request): string {
  const { submissionId } = request.params;
  if (typeof submissionId !== 'string' || submissionId.length === 0) {
    throw badRequest('submissionId is required');
  }
  return submissionId;
}

function requireArtworkIdParam(request: Request): string {
  const { artworkId } = request.params;
  if (typeof artworkId !== 'string' || artworkId.length === 0) {
    throw badRequest('artworkId is required');
  }
  return artworkId;
}

function parseUpdateSubmissionBody(body: unknown): UpdateSubmissionDto {
  const input = (body ?? {}) as Record<string, unknown>;
  const result: UpdateSubmissionDto = {};

  if (input.firstName !== undefined) {
    if (typeof input.firstName !== 'string' || input.firstName.length === 0) {
      throw badRequest('firstName must be a non-empty string');
    }
    result.firstName = input.firstName;
  }
  if (input.lastName !== undefined) {
    if (typeof input.lastName !== 'string' || input.lastName.length === 0) {
      throw badRequest('lastName must be a non-empty string');
    }
    result.lastName = input.lastName;
  }
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      throw badRequest('description must be a string');
    }
    result.description = input.description;
  }

  return result;
}

function parseUpdateArtworkBody(body: unknown): UpdateArtworkDto {
  const input = (body ?? {}) as Record<string, unknown>;
  const result: UpdateArtworkDto = {};

  if (input.title !== undefined) {
    if (typeof input.title !== 'string') {
      throw badRequest('title must be a string');
    }
    result.title = input.title;
  }
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      throw badRequest('description must be a string');
    }
    result.description = input.description;
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
  const contestId = requireContestIdParam(request);
  const submissions = await listAdminSubmissions(contestId);
  response.json(submissions);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const submissionId = requireSubmissionIdParam(request);
  const submission = await getAdminSubmission(contestId, submissionId);
  response.json(submission);
}

export async function remove(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const submissionId = requireSubmissionIdParam(request);
  await deleteSubmission(contestId, submissionId);
  response.status(204).end();
}

export async function update(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const submissionId = requireSubmissionIdParam(request);
  const input = parseUpdateSubmissionBody(request.body);
  const submission = await updateSubmission(contestId, submissionId, input);
  response.json(submission);
}

export async function updateArtworkTitle(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const submissionId = requireSubmissionIdParam(request);
  const artworkId = requireArtworkIdParam(request);
  const input = parseUpdateArtworkBody(request.body);
  const submission = await updateArtwork(contestId, submissionId, artworkId, input);
  response.json(submission);
}

export async function removeArtwork(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const submissionId = requireSubmissionIdParam(request);
  const artworkId = requireArtworkIdParam(request);
  const submission = await deleteArtwork(contestId, submissionId, artworkId);
  response.json(submission);
}

export async function reorder(request: Request, response: Response): Promise<void> {
  const contestId = requireContestIdParam(request);
  const submissionId = requireSubmissionIdParam(request);
  const order = parseOrderBody(request.body);
  const submission = await reorderArtworks(contestId, submissionId, order);
  response.json(submission);
}
