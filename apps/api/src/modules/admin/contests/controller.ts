import type { Request, Response } from 'express';
import type { CreateContestDto, UpdateContestDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import {
  createContest,
  deleteContest,
  getContestById,
  listContests,
  updateContest,
} from './service.js';

function assertCreatePayload(body: unknown): CreateContestDto {
  const input = body as Partial<CreateContestDto> | null;

  if (
    !input ||
    typeof input.title !== 'string' ||
    typeof input.submissionStart !== 'string' ||
    typeof input.submissionDeadline !== 'string' ||
    typeof input.votingStart !== 'string' ||
    typeof input.votingEnd !== 'string'
  ) {
    throw badRequest(
      'title, submissionStart, submissionDeadline, votingStart and votingEnd are required',
    );
  }

  return input as CreateContestDto;
}

function requireIdParam(request: Request): string {
  const { id } = request.params;
  if (typeof id !== 'string' || id.length === 0) {
    throw badRequest('id is required');
  }
  return id;
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = assertCreatePayload(request.body);
  const contest = await createContest(input);
  response.status(201).json(contest);
}

export async function list(_request: Request, response: Response): Promise<void> {
  const contests = await listContests();
  response.json(contests);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contest = await getContestById(requireIdParam(request));
  response.json(contest);
}

export async function update(request: Request, response: Response): Promise<void> {
  const input = request.body as UpdateContestDto;
  const contest = await updateContest(requireIdParam(request), input);
  response.json(contest);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteContest(requireIdParam(request));
  response.status(204).end();
}
