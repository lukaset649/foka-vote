import type { AlbumDetailDto, GalleryAlbumDto } from '@foka-vote/shared';
import { apiErrorFrom, apiRequest } from './apiClient';

export async function fetchGalleryAlbums(): Promise<GalleryAlbumDto[]> {
  const response = await apiRequest('/api/gallery/albums');
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch albums');
  }
  return response.json() as Promise<GalleryAlbumDto[]>;
}

export function albumPath(album: GalleryAlbumDto): string {
  return album.kind === 'CONTEST' ? `/contest/${album.slug}/gallery` : `/gallery/${album.slug}`;
}

export async function fetchAlbum(slug: string): Promise<AlbumDetailDto> {
  const response = await apiRequest(`/api/gallery/albums/${slug}`);
  if (!response.ok) {
    throw await apiErrorFrom(response, 'Failed to fetch album');
  }
  return response.json() as Promise<AlbumDetailDto>;
}
