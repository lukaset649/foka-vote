import type { Request, Response } from 'express';
import { SLUG_PATTERN, type CreateContestDto, type UpdateContestDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import { parseListQuery } from '../../../lib/list-query.js';
import {
  parseOptionalText,
  parseRequiredText,
  requireObjectBody,
} from '../../../lib/request-body.js';
import { requireParam } from '../../../lib/request-params.js';
import {
  createContest,
  deleteContest,
  getContestById,
  listContests,
  updateContest,
} from './service.js';

function parseDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw badRequest(`${field} must be a valid date string`);
  }
  return value;
}

function parseSlug(value: unknown): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !SLUG_PATTERN.test(value)) {
    throw badRequest('slug may contain only lowercase letters, digits and single hyphens');
  }
  return value;
}

function parseMaxArtworks(value: unknown): number | undefined {
  if (value === undefined || typeof value === 'number') {
    return value;
  }
  throw badRequest('maxArtworksPerSubmission must be a number');
}

function parseAccessCode(value: unknown): string | null | undefined {
  if (typeof value === 'string' && value.length > 0 && value.trim().length === 0) {
    throw badRequest('accessCode must not be blank');
  }
  return parseOptionalText(value, 'accessCode');
}

function parseCreatePayload(rawBody: unknown): CreateContestDto {
  const body = requireObjectBody(rawBody);
  if (body.topicId !== undefined && typeof body.topicId !== 'string') {
    throw badRequest('topicId must be a string');
  }

  const slug = parseSlug(body.slug);
  const description = parseOptionalText(body.description, 'description');
  const accessCode = parseAccessCode(body.accessCode);
  const maxArtworksPerSubmission = parseMaxArtworks(body.maxArtworksPerSubmission);

  return {
    title: parseRequiredText(body.title, 'title'),
    submissionStart: parseDate(body.submissionStart, 'submissionStart'),
    submissionDeadline: parseDate(body.submissionDeadline, 'submissionDeadline'),
    votingStart: parseDate(body.votingStart, 'votingStart'),
    votingEnd: parseDate(body.votingEnd, 'votingEnd'),
    ...(slug !== undefined ? { slug } : {}),
    ...(description != null ? { description } : {}),
    ...(accessCode != null ? { accessCode } : {}),
    ...(maxArtworksPerSubmission !== undefined ? { maxArtworksPerSubmission } : {}),
    ...(body.topicId !== undefined ? { topicId: body.topicId } : {}),
  };
}

function parseUpdatePayload(rawBody: unknown): UpdateContestDto {
  const body = requireObjectBody(rawBody);
  const input: UpdateContestDto = {};

  if (body.title !== undefined) {
    input.title = parseRequiredText(body.title, 'title');
  }
  const slug = parseSlug(body.slug);
  if (slug !== undefined) {
    input.slug = slug;
  }
  for (const field of [
    'submissionStart',
    'submissionDeadline',
    'votingStart',
    'votingEnd',
  ] as const) {
    if (body[field] !== undefined) {
      input[field] = parseDate(body[field], field);
    }
  }
  const description = parseOptionalText(body.description, 'description');
  if (description !== undefined) {
    input.description = description;
  }
  const accessCode = parseAccessCode(body.accessCode);
  if (accessCode !== undefined) {
    input.accessCode = accessCode;
  }
  const maxArtworksPerSubmission = parseMaxArtworks(body.maxArtworksPerSubmission);
  if (maxArtworksPerSubmission !== undefined) {
    input.maxArtworksPerSubmission = maxArtworksPerSubmission;
  }

  return input;
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = parseCreatePayload(request.body);
  const contest = await createContest(input);
  response.status(201).json(contest);
}

export async function list(request: Request, response: Response): Promise<void> {
  const contests = await listContests(parseListQuery(request.query));
  response.json(contests);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contest = await getContestById(requireParam(request, 'id'));
  response.json(contest);
}

export async function update(request: Request, response: Response): Promise<void> {
  const input = parseUpdatePayload(request.body);
  const contest = await updateContest(requireParam(request, 'id'), input);
  response.json(contest);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteContest(requireParam(request, 'id'));
  response.status(204).end();
}
