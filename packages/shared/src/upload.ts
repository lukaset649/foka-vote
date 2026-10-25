export interface PendingUploadDto {
  id: string;
  thumbUrl: string;
}

export interface SubmissionPhotoDto {
  uploadId: string;
  title?: string;
  description?: string;
}
