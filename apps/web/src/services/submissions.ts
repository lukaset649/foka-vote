import type {
  AdminSubmissionDto,
  ErrorResponseBody,
  SubmissionDto,
  UpdateArtworkDto,
  UpdateSubmissionDto,
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

export async function fetchSubmissions(slug: string): Promise<SubmissionDto[]> {
  const response = await apiRequest(`/api/contests/${slug}/submissions`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to fetch submissions'));
  }
  return response.json() as Promise<SubmissionDto[]>;
}

export interface CreateSubmissionData {
  firstName: string;
  lastName: string;
  description: string;
}

export interface CreateSubmissionArtwork {
  file: File;
  title: string;
  description: string;
}

export async function createSubmission(
  slug: string,
  data: CreateSubmissionData,
  artworks: CreateSubmissionArtwork[],
): Promise<SubmissionDto> {
  const formData = new FormData();
  formData.append('firstName', data.firstName);
  formData.append('lastName', data.lastName);
  if (data.description) {
    formData.append('description', data.description);
  }
  formData.append(
    'meta',
    JSON.stringify(
      artworks.map((artwork) => ({
        title: artwork.title || undefined,
        description: artwork.description || undefined,
      })),
    ),
  );
  artworks.forEach((artwork) => formData.append('artworks', artwork.file));

  const response = await apiRequest(`/api/contests/${slug}/submissions`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to submit'));
  }
  return response.json() as Promise<SubmissionDto>;
}

export async function fetchAdminSubmissions(contestId: string): Promise<AdminSubmissionDto[]> {
  const response = await apiRequest(`/api/admin/contests/${contestId}/submissions`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to fetch submissions'));
  }
  return response.json() as Promise<AdminSubmissionDto[]>;
}

export async function deleteAdminSubmission(
  contestId: string,
  submissionId: string,
): Promise<void> {
  const response = await apiRequest(
    `/api/admin/contests/${contestId}/submissions/${submissionId}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to delete submission'));
  }
}

export async function fetchAdminSubmission(
  contestId: string,
  submissionId: string,
): Promise<AdminSubmissionDto> {
  const response = await apiRequest(`/api/admin/contests/${contestId}/submissions/${submissionId}`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to fetch submission'));
  }
  return response.json() as Promise<AdminSubmissionDto>;
}

export async function updateAdminSubmission(
  contestId: string,
  submissionId: string,
  input: UpdateSubmissionDto,
): Promise<AdminSubmissionDto> {
  const response = await apiRequest(
    `/api/admin/contests/${contestId}/submissions/${submissionId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to update submission'));
  }
  return response.json() as Promise<AdminSubmissionDto>;
}

export async function updateAdminArtwork(
  contestId: string,
  submissionId: string,
  artworkId: string,
  input: UpdateArtworkDto,
): Promise<AdminSubmissionDto> {
  const response = await apiRequest(
    `/api/admin/contests/${contestId}/submissions/${submissionId}/artworks/${artworkId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to update artwork'));
  }
  return response.json() as Promise<AdminSubmissionDto>;
}

export async function deleteAdminArtwork(
  contestId: string,
  submissionId: string,
  artworkId: string,
): Promise<AdminSubmissionDto> {
  const response = await apiRequest(
    `/api/admin/contests/${contestId}/submissions/${submissionId}/artworks/${artworkId}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to delete artwork'));
  }
  return response.json() as Promise<AdminSubmissionDto>;
}

export async function reorderAdminArtworks(
  contestId: string,
  submissionId: string,
  order: string[],
): Promise<AdminSubmissionDto> {
  const response = await apiRequest(
    `/api/admin/contests/${contestId}/submissions/${submissionId}/artworks/order`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to reorder artworks'));
  }
  return response.json() as Promise<AdminSubmissionDto>;
}

export async function replaceAdminArtwork(
  contestId: string,
  submissionId: string,
  artworkId: string,
  file: File,
): Promise<AdminSubmissionDto> {
  const formData = new FormData();
  formData.append('artwork', file);

  const response = await apiRequest(
    `/api/admin/contests/${contestId}/submissions/${submissionId}/artworks/${artworkId}/replace`,
    { method: 'POST', body: formData },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to replace artwork'));
  }
  return response.json() as Promise<AdminSubmissionDto>;
}
