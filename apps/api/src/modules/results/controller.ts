import type { Request, Response } from 'express';
import { badRequest } from '../../errors/app-error.js';
import { getContestResults } from './service.js';

function requireSlugParam(request: Request): string {
  const { slug } = request.params;
  if (typeof slug !== 'string' || slug.length === 0) {
    throw badRequest('slug is required');
  }
  return slug;
}

export async function getResults(request: Request, response: Response): Promise<void> {
  const slug = requireSlugParam(request);
  const results = await getContestResults(slug);
  response.json(results);
}
