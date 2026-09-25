export type AlbumKind = 'CONTEST' | 'STANDALONE';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
  locked: boolean;
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

export interface AlbumDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  photos: AlbumPhotoDto[];
}

export interface CreateAlbumDto {
  title: string;
  description?: string;
}

export type UpdateAlbumDto = Partial<CreateAlbumDto>;

export interface AdminAlbumDto {
  kind: AlbumKind;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  status: ModerationStatus;
  hidden: boolean;
  photoCount: number;
  pendingPhotoCount: number;
  coverThumbUrl: string | null;
}

export interface AdminAlbumPhotoDto extends AlbumPhotoDto {
  firstName: string;
  lastName: string;
  status: ModerationStatus;
  rulesAcceptedAt: string;
}

export interface UpdateAlbumPhotoDto {
  title?: string;
  description?: string;
}

/** Admin-only: the gallery access code is never exposed through the public API. */
export interface AdminGallerySettingsDto {
  accessCode: string | null;
}
