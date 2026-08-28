import type {
  AdminContestDto,
  ContestDto,
  CreateContestDto,
  UpdateContestDto,
} from '@foka-vote/shared';
import { apiErrorFrom, apiRequest } from './apiClient';

export async function fetchContests(): Promise<ContestDto[]> {
  const response = await apiRequest('/api/contests');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch contests');
  }
  return response.json() as Promise<ContestDto[]>;
}

export async function fetchContest(slug: string): Promise<ContestDto> {
  const response = await apiRequest(`/api/contests/${slug}`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch contest');
  }
  return response.json() as Promise<ContestDto>;
}

export async function verifyContestAccessCode(slug: string, code: string): Promise<void> {
  const response = await apiRequest(`/api/contests/${slug}/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to verify access code');
  }
}

export async function fetchAdminContests(): Promise<AdminContestDto[]> {
  const response = await apiRequest('/api/admin/contests');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch contests');
  }
  return response.json() as Promise<AdminContestDto[]>;
}

export async function fetchAdminContest(id: string): Promise<AdminContestDto> {
  const response = await apiRequest(`/api/admin/contests/${id}`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch contest');
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
    throw await apiErrorFrom(response, 'Failed to create contest');
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
    throw await apiErrorFrom(response, 'Failed to update contest');
  }
  return response.json() as Promise<AdminContestDto>;
}
