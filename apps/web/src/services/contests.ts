import type { AdminContestDto } from '@foka-vote/shared';
import { apiRequest } from './apiClient';

export async function fetchAdminContests(): Promise<AdminContestDto[]> {
  const response = await apiRequest('/api/admin/contests');
  if (!response.ok) {
    throw new Error('Failed to fetch contests');
  }
  return response.json() as Promise<AdminContestDto[]>;
}
