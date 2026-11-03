import type { ContestTopicDto, SaveContestTopicDto } from '@foka-vote/shared';
import { apiErrorFrom, apiRequest } from './apiClient';

export async function fetchContestTopics(): Promise<ContestTopicDto[]> {
  const response = await apiRequest('/api/admin/contest-topics');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch contest topics');
  }
  return response.json() as Promise<ContestTopicDto[]>;
}

export async function createContestTopic(input: SaveContestTopicDto): Promise<ContestTopicDto> {
  const response = await apiRequest('/api/admin/contest-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to create contest topic');
  }
  return response.json() as Promise<ContestTopicDto>;
}

export async function updateContestTopic(
  id: string,
  input: SaveContestTopicDto,
): Promise<ContestTopicDto> {
  const response = await apiRequest(`/api/admin/contest-topics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update contest topic');
  }
  return response.json() as Promise<ContestTopicDto>;
}

export async function deleteContestTopic(id: string): Promise<void> {
  const response = await apiRequest(`/api/admin/contest-topics/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to delete contest topic');
  }
}
