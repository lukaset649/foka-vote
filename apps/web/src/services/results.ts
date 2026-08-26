import type { ErrorResponseBody, ResultsDto } from '@foka-vote/shared';
import { apiRequest } from './apiClient';

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    return body.error.message;
  } catch {
    return fallback;
  }
}

export async function fetchResults(slug: string): Promise<ResultsDto> {
  const response = await apiRequest(`/api/contests/${slug}/results`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to fetch results'));
  }
  return response.json() as Promise<ResultsDto>;
}
