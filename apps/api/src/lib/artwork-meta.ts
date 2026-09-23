import { badRequest } from '../errors/app-error.js';

/** Per-file caption sent alongside a multipart upload, as a JSON `meta` field. */
export interface ArtworkMetaInput {
  title?: string;
  description?: string;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function parseArtworkMeta(raw: unknown): ArtworkMetaInput[] {
  if (typeof raw !== 'string') {
    throw badRequest('meta is required');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw badRequest('meta must be valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw badRequest('meta must be an array');
  }

  return parsed.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      throw badRequest('meta entries must be objects');
    }
    const { title, description } = entry as Record<string, unknown>;
    const titleValue = optionalString(title);
    const descriptionValue = optionalString(description);
    return {
      ...(titleValue !== undefined ? { title: titleValue } : {}),
      ...(descriptionValue !== undefined ? { description: descriptionValue } : {}),
    };
  });
}
