import type { SubmissionPhotoDto } from './upload.js';

export type AlbumKind = 'CONTEST' | 'STANDALONE';

export interface GalleryPreviewImageDto {
  id: string;
  title: string | null;
  description: string | null;
  previewUrl: string;
  width: number | null;
  height: number | null;
  author: string | null;
}

export interface GalleryAlbumPreviewDto {
  id: string;
  thumbUrl: string;
  label: string | null;
  images: GalleryPreviewImageDto[];
}

export interface GalleryAlbumDto {
  kind: AlbumKind;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  itemCount: number;
  previews: GalleryAlbumPreviewDto[];
}

export interface AlbumPhotoDto {
  id: string;
  authorName: string;
  title: string | null;
  description: string | null;
  fullUrl: string;
  previewUrl: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface AlbumSubmissionDto {
  id: string;
  authorName: string;
  createdAt: string;
  photos: AlbumPhotoDto[];
}

export interface AlbumDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  hasAccessCode: boolean;
  canUpload: boolean;
  submissions: AlbumSubmissionDto[];
}

export interface CreateAlbumDto {
  title: string;
  description?: string;
  accessCode?: string;
}

export type UpdateAlbumDto = Partial<CreateAlbumDto>;

export interface CreateAlbumSubmissionDto {
  firstName: string;
  lastName: string;
  rulesAccepted: true;
  photos: SubmissionPhotoDto[];
}

export interface AdminAlbumDto {
  kind: AlbumKind;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  accessCode: string | null;
  hidden: boolean;
  itemCount: number;
  coverThumbUrl: string | null;
}

export interface AdminAlbumPhotoDto extends AlbumPhotoDto {
  firstName: string;
  lastName: string;
  rulesAcceptedAt: string;
}

export interface UpdateAlbumPhotoDto {
  title?: string;
  description?: string;
}

/** Admin-only: the gallery access code is never exposed through the public API. */
