import type { VoteCardDto, VoteCardPick } from '@foka-vote/shared';
import { apiErrorFrom, apiRequest } from './apiClient';

export async function fetchMyVoteCard(slug: string): Promise<VoteCardDto | null> {
  const response = await apiRequest(`/api/contests/${slug}/votes/me`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch vote card');
  }
  return response.json() as Promise<VoteCardDto>;
}

export async function submitVoteCard(slug: string, picks: VoteCardPick[]): Promise<VoteCardDto> {
  const response = await apiRequest(`/api/contests/${slug}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ picks }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to submit vote');
  }
  return response.json() as Promise<VoteCardDto>;
}

export async function fetchAdminVoteCards(contestId: string): Promise<VoteCardDto[]> {
  const response = await apiRequest(`/api/admin/contests/${contestId}/vote-cards`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch vote cards');
  }
  return response.json() as Promise<VoteCardDto[]>;
}

export async function voidVoteCard(
  contestId: string,
  cardId: string,
  reason?: string,
): Promise<VoteCardDto> {
  const response = await apiRequest(`/api/admin/contests/${contestId}/vote-cards/${cardId}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to void vote card');
  }
  return response.json() as Promise<VoteCardDto>;
}

export async function unvoidVoteCard(contestId: string, cardId: string): Promise<VoteCardDto> {
  const response = await apiRequest(
    `/api/admin/contests/${contestId}/vote-cards/${cardId}/unvoid`,
    { method: 'POST' },
  );
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to restore vote card');
  }
  return response.json() as Promise<VoteCardDto>;
}
