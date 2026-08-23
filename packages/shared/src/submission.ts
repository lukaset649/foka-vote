export interface ArtworkDto {
  id: string;
  title: string | null;
  description: string | null;
  previewUrl: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export interface SubmissionDto {
  id: string;
  alias: string;
  description: string | null;
  artworks: ArtworkDto[];
  createdAt: string;
}

export interface AdminSubmissionDto extends SubmissionDto {
  firstName: string;
  lastName: string;
}

export interface CreateSubmissionDto {
  firstName: string;
  lastName: string;
  description?: string;
}
