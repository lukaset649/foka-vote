import { badRequest } from '../errors/app-error.js';

/** One already uploaded photo of a submission, in the order it should appear. */
export interface SubmissionPhotoInput {
  uploadId: string;
  title: string | null;
  description: string | null;
}

function optionalCaption(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string`);
  }
  return value.length > 0 ? value : null;
}

export function parseSubmissionPhotos(raw: unknown, field: string): SubmissionPhotoInput[] {
  if (!Array.isArray(raw)) {
    throw badRequest(`${field} must be an array`);
  }

  return raw.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) {
      throw badRequest(`${field} entries must be objects`);
    }
    const { uploadId, title, description } = entry as Record<string, unknown>;
    if (typeof uploadId !== 'string' || uploadId.length === 0) {
      throw badRequest(`${field} entries must include uploadId`);
    }
    return {
      uploadId,
      title: optionalCaption(title, 'title'),
      description: optionalCaption(description, 'description'),
    };
  });
}
