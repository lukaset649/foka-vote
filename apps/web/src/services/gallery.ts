import type { AlbumDetailDto, CreateAlbumDto, GalleryAlbumDto } from '@foka-vote/shared';
import { apiErrorFrom, apiRequest } from './apiClient';

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
