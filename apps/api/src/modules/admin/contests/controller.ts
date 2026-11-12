import type { Request, Response } from 'express';
import type { CreateContestDto, UpdateContestDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import { parseListQuery } from '../../../lib/list-query.js';
import { requireParam } from '../../../lib/request-params.js';
import {
  createContest,
  deleteContest,
  getContestById,
  listContests,
  updateContest,
} from './service.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Body = Record<string, unknown>;

function requireObjectBody(body: unknown): Body {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }
  return body as Body;
}

function parseTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest('title must be a non-empty string');
  }
  return value.trim();
}

function parseDate(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a date string`);
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

function parseNullableString(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null || typeof value === 'string') {
    return value;
  }
  throw badRequest(`${field} must be a string or null`);
}

function parseMaxArtworks(value: unknown): number | undefined {
  if (value === undefined || typeof value === 'number') {
    return value;
  }
  throw badRequest('maxArtworksPerSubmission must be a number');
}

function parseCreatePayload(rawBody: unknown): CreateContestDto {
  const body = requireObjectBody(rawBody);
  if (body.topicId !== undefined && typeof body.topicId !== 'string') {
    throw badRequest('topicId must be a string');
  }

  const slug = parseSlug(body.slug);
  const description = parseNullableString(body.description, 'description');
  const accessCode = parseNullableString(body.accessCode, 'accessCode');
  const maxArtworksPerSubmission = parseMaxArtworks(body.maxArtworksPerSubmission);

  return {
    title: parseTitle(body.title),
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
    input.title = parseTitle(body.title);
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
  const description = parseNullableString(body.description, 'description');
  if (description !== undefined) {
    input.description = description;
  }
  const accessCode = parseNullableString(body.accessCode, 'accessCode');
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
