import type {
  AdminContestDto,
  ContestDto,
  CreateContestDto,
  ErrorResponseBody,
  UpdateContestDto,
} from '@foka-vote/shared';
import { apiRequest } from './apiClient';

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    return body.error.message;
  } catch {
    return fallback;
  }
}

export async function fetchContests(): Promise<ContestDto[]> {
  const response = await apiRequest('/api/contests');
  if (!response.ok) {
    throw new Error('Failed to fetch contests');
  }
  return response.json() as Promise<ContestDto[]>;
}

export async function fetchAdminContests(): Promise<AdminContestDto[]> {
  const response = await apiRequest('/api/admin/contests');
  if (!response.ok) {
    throw new Error('Failed to fetch contests');
  }
  return response.json() as Promise<AdminContestDto[]>;
}

export async function fetchAdminContest(id: string): Promise<AdminContestDto> {
  const response = await apiRequest(`/api/admin/contests/${id}`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to fetch contest'));
  }
  return response.json() as Promise<AdminContestDto>;
}

export async function createContest(input: CreateContestDto): Promise<AdminContestDto> {
  const response = await apiRequest('/api/admin/contests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to create contest'));
  }
  return response.json() as Promise<AdminContestDto>;
}

export async function updateContest(id: string, input: UpdateContestDto): Promise<AdminContestDto> {
  const response = await apiRequest(`/api/admin/contests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to update contest'));
  }
  return response.json() as Promise<AdminContestDto>;
}
