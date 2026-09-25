import type {
  AdminAlbumDto,
  AdminAlbumPhotoDto,
  AdminGallerySettingsDto,
  AlbumDetailDto,
  CreateAlbumDto,
  GalleryAlbumDto,
  ModerationStatus,
  UpdateAlbumDto,
  UpdateAlbumPhotoDto,
} from '@foka-vote/shared';
import { apiErrorFrom, apiRequest, apiUploadWithProgress } from './apiClient';

export async function fetchGalleryAlbums(): Promise<GalleryAlbumDto[]> {
  const response = await apiRequest('/api/gallery/albums');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch albums');
  }
  return response.json() as Promise<GalleryAlbumDto[]>;
}

export function albumPath(album: GalleryAlbumDto): string {
  return album.kind === 'CONTEST'
    ? `/contest/${album.slug}/gallery?from=gallery`
    : `/gallery/${album.slug}`;
}

export async function fetchAlbum(slug: string): Promise<AlbumDetailDto> {
  const response = await apiRequest(`/api/gallery/albums/${slug}`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch album');
  }
  return response.json() as Promise<AlbumDetailDto>;
}

export function galleryGatePath(redirectTo: string): string {
  return `/gallery/gate?redirect=${encodeURIComponent(redirectTo)}`;
}

export async function verifyGalleryAccessCode(code: string): Promise<void> {
  const response = await apiRequest('/api/gallery/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to verify access code');
  }
}

export async function createAlbum(input: CreateAlbumDto): Promise<void> {
  const response = await apiRequest('/api/gallery/albums', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to create album');
  }
}

export interface AlbumPhotoUpload {
  file: File;
  title: string;
  description: string;
}

export async function addAlbumPhotos(
  slug: string,
  author: { firstName: string; lastName: string },
  photos: AlbumPhotoUpload[],
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const formData = new FormData();
  formData.append('firstName', author.firstName);
  formData.append('lastName', author.lastName);
  formData.append('rulesAccepted', 'true');
  formData.append(
    'meta',
    JSON.stringify(
      photos.map((photo) => ({
        title: photo.title || undefined,
        description: photo.description || undefined,
      })),
    ),
  );
  photos.forEach((photo) => formData.append('photos', photo.file));

  const response = await apiUploadWithProgress(
    `/api/gallery/albums/${slug}/photos`,
    formData,
    onProgress,
  );
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to upload photos');
  }
}

export async function fetchAdminGallerySettings(): Promise<AdminGallerySettingsDto> {
  const response = await apiRequest('/api/admin/gallery/settings');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch gallery settings');
  }
  return response.json() as Promise<AdminGallerySettingsDto>;
}

export async function updateAdminGallerySettings(
  accessCode: string | null,
): Promise<AdminGallerySettingsDto> {
  const response = await apiRequest('/api/admin/gallery/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update gallery settings');
  }
  return response.json() as Promise<AdminGallerySettingsDto>;
}

export async function fetchAdminAlbums(): Promise<AdminAlbumDto[]> {
  const response = await apiRequest('/api/admin/gallery/albums');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch albums');
  }
  return response.json() as Promise<AdminAlbumDto[]>;
}

export async function fetchAdminAlbum(id: string): Promise<AdminAlbumDto> {
  const response = await apiRequest(`/api/admin/gallery/albums/${id}`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch album');
  }
  return response.json() as Promise<AdminAlbumDto>;
}

export async function updateAdminAlbum(id: string, input: UpdateAlbumDto): Promise<AdminAlbumDto> {
  const response = await apiRequest(`/api/admin/gallery/albums/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update album');
  }
  return response.json() as Promise<AdminAlbumDto>;
}

export async function setAdminAlbumStatus(
  id: string,
  status: ModerationStatus,
): Promise<AdminAlbumDto> {
  const response = await apiRequest(`/api/admin/gallery/albums/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update album status');
  }
  return response.json() as Promise<AdminAlbumDto>;
}

export async function setAdminAlbumVisibility(id: string, hidden: boolean): Promise<AdminAlbumDto> {
  const response = await apiRequest(`/api/admin/gallery/albums/${id}/visibility`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update album visibility');
  }
  return response.json() as Promise<AdminAlbumDto>;
}

export async function deleteAdminAlbum(id: string): Promise<void> {
  const response = await apiRequest(`/api/admin/gallery/albums/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to delete album');
  }
}

export async function setContestAlbumVisibility(
  contestId: string,
  hidden: boolean,
): Promise<AdminAlbumDto> {
  const response = await apiRequest(`/api/admin/gallery/contests/${contestId}/visibility`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update album visibility');
  }
  return response.json() as Promise<AdminAlbumDto>;
}

export async function fetchAdminAlbumPhotos(albumId: string): Promise<AdminAlbumPhotoDto[]> {
  const response = await apiRequest(`/api/admin/gallery/albums/${albumId}/photos`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch photos');
  }
  return response.json() as Promise<AdminAlbumPhotoDto[]>;
}

export async function setAdminAlbumPhotoStatus(
  albumId: string,
  photoId: string,
  status: ModerationStatus,
): Promise<AdminAlbumPhotoDto> {
  const response = await apiRequest(
    `/api/admin/gallery/albums/${albumId}/photos/${photoId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update photo status');
  }
  return response.json() as Promise<AdminAlbumPhotoDto>;
}

export async function updateAdminAlbumPhoto(
  albumId: string,
  photoId: string,
  input: UpdateAlbumPhotoDto,
): Promise<AdminAlbumPhotoDto> {
  const response = await apiRequest(`/api/admin/gallery/albums/${albumId}/photos/${photoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to update photo');
  }
  return response.json() as Promise<AdminAlbumPhotoDto>;
}

export async function deleteAdminAlbumPhoto(albumId: string, photoId: string): Promise<void> {
  const response = await apiRequest(`/api/admin/gallery/albums/${albumId}/photos/${photoId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to delete photo');
  }
}
