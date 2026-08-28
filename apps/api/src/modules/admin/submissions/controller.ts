import type { Request, Response } from 'express';
import { badRequest } from '../../../errors/app-error.js';
import { deleteSubmission, getAdminSubmission, listAdminSubmissions } from './service.js';

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
