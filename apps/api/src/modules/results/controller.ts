import type { Request, Response } from 'express';
import { requireParam } from '../../lib/request-params.js';
import { getContestResults } from './service.js';

export async function getResults(request: Request, response: Response): Promise<void> {
  const slug = requireParam(request, 'slug');
  const results = await getContestResults(slug);
  response.json(results);
}
