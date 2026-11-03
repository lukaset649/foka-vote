import type { Request, Response } from 'express';
import type { SaveContestTopicDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import {
  createContestTopic,
  deleteContestTopic,
  listContestTopics,
  updateContestTopic,
} from './service.js';

function requireIdParam(request: Request): string {
  const { id } = request.params;
  if (typeof id !== 'string' || id.length === 0) {
    throw badRequest('id is required');
  }
  return id;
}

function parseTopicPayload(body: unknown): SaveContestTopicDto {
  const { title } = (body ?? {}) as Record<string, unknown>;
  if (typeof title !== 'string') {
    throw badRequest('title is required');
  }
  return { title };
}

export async function list(_request: Request, response: Response): Promise<void> {
  const topics = await listContestTopics();
  response.json(topics);
}

export async function create(request: Request, response: Response): Promise<void> {
  const topic = await createContestTopic(parseTopicPayload(request.body));
  response.status(201).json(topic);
}

export async function update(request: Request, response: Response): Promise<void> {
  const topic = await updateContestTopic(requireIdParam(request), parseTopicPayload(request.body));
  response.json(topic);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteContestTopic(requireIdParam(request));
  response.status(204).end();
}
