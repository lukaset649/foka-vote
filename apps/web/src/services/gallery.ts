import type { AlbumDetailDto, CreateAlbumDto, GalleryAlbumDto } from '@foka-vote/shared';
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
