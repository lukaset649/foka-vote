import type { Request, Response } from 'express';
import { badRequest } from '../../errors/app-error.js';
import { getPublicContestBySlug, listPublicContests } from './service.js';

function requireSlugParam(request: Request): string {
  const { slug } = request.params;
  if (typeof slug !== 'string' || slug.length === 0) {
    throw badRequest('slug is required');
  }
  return slug;
}

export async function list(_request: Request, response: Response): Promise<void> {
  const contests = await listPublicContests();
  response.json(contests);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const contest = await getPublicContestBySlug(requireSlugParam(request));
  response.json(contest);
}
