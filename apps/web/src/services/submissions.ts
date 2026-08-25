import type { ErrorResponseBody, SubmissionDto } from '@foka-vote/shared';
import { apiRequest } from './apiClient';

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    return body.error.message;
  } catch {
    return fallback;
  }
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
