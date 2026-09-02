import { NICKNAME_POOL } from './nickname-pool.js';

export const MAX_ARTWORK_FILE_SIZE_MB = 25;
export const MAX_ARTWORK_FILE_SIZE_BYTES = MAX_ARTWORK_FILE_SIZE_MB * 1024 * 1024;
export const MIN_ARTWORK_DIMENSION_PX = 800;

export const ALLOWED_ARTWORK_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export type AllowedArtworkMimeType = (typeof ALLOWED_ARTWORK_MIME_TYPES)[number];

export const DEFAULT_MAX_ARTWORKS_PER_SUBMISSION = 3;
// Bounded so a contest's worst-case upload size (this * MAX_ARTWORK_FILE_SIZE_BYTES)
// stays within the reverse proxy's client_max_body_size (see deploy/nginx.conf).
export const MAX_ARTWORKS_PER_SUBMISSION_LIMIT = 15;

export const VOTE_WEIGHTS = [3, 2, 1] as const;
export const MAX_VOTE_SLOTS = VOTE_WEIGHTS.length;

export const MAX_SUBMISSIONS_PER_CONTEST = NICKNAME_POOL.length;
