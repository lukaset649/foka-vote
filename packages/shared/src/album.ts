export type AlbumKind = 'CONTEST' | 'STANDALONE';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface GalleryAlbumDto {
  kind: AlbumKind;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  /** A contest behind an access code: no preview is exposed until the code is entered. */
  locked: boolean;
  /** Submissions for a contest album, approved photos for a standalone one. */
  itemCount: number;
  previewThumbUrls: string[];
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
