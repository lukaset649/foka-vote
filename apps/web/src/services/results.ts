import type { ResultsDto } from '@foka-vote/shared';
import { apiErrorFrom, apiRequest } from './apiClient';

export async function fetchResults(slug: string): Promise<ResultsDto> {
  const response = await apiRequest(`/api/contests/${slug}/results`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch results');
  }
  return response.json() as Promise<ResultsDto>;
}
