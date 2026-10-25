import type { PendingUploadDto } from '@foka-vote/shared';
import { apiErrorFrom, apiRequest, apiUploadWithProgress } from './apiClient';

export interface UploadTarget {
  kind: 'album' | 'contest';
  slug: string;
}

function uploadsPath(target: UploadTarget): string {
  return target.kind === 'album'
    ? `/api/gallery/albums/${target.slug}/uploads`
    : `/api/contests/${target.slug}/uploads`;
}

export async function uploadPendingPhoto(
  target: UploadTarget,
  file: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<PendingUploadDto> {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await apiUploadWithProgress(uploadsPath(target), formData, onProgress, signal);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to upload photo');
  }
  return response.json() as Promise<PendingUploadDto>;
}

export async function deletePendingPhoto(target: UploadTarget, uploadId: string): Promise<void> {
  // keepalive lets the request finish when it is sent right before leaving the page.
  const response = await apiRequest(`${uploadsPath(target)}/${uploadId}`, {
    method: 'DELETE',
    keepalive: true,
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to remove photo');
  }
}
