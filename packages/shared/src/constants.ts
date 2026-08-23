import { NICKNAME_POOL } from './nickname-pool.js';

export const MAX_ARTWORK_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MIN_ARTWORK_DIMENSION_PX = 800;

export const ALLOWED_ARTWORK_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export type AllowedArtworkMimeType = (typeof ALLOWED_ARTWORK_MIME_TYPES)[number];

export const DEFAULT_MAX_ARTWORKS_PER_SUBMISSION = 3;

export const VOTE_WEIGHTS = [3, 2, 1] as const;
export const MAX_VOTE_SLOTS = VOTE_WEIGHTS.length;

export const MAX_SUBMISSIONS_PER_CONTEST = NICKNAME_POOL.length;
