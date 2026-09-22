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

// Kept at or below MAX_ARTWORKS_PER_SUBMISSION_LIMIT so album uploads stay within the
// same reverse proxy body limit the submission form already fits into.
export const MAX_PHOTOS_PER_ALBUM_UPLOAD = 15;
// Anyone may add photos to an approved album, so a queue cap keeps a single album from
// filling the disk while it waits for moderation.
export const MAX_PENDING_PHOTOS_PER_ALBUM = 50;

export const GALLERY_ALBUM_PREVIEW_COUNT = 8;

// Slugs are generated from user-supplied album titles, so they must never collide with
// the gallery's own sub-routes.
export const RESERVED_ALBUM_SLUGS = ['new', 'gate'] as const;

export const VOTE_WEIGHTS = [3, 2, 1] as const;
export const MAX_VOTE_SLOTS = VOTE_WEIGHTS.length;

export const MAX_SUBMISSIONS_PER_CONTEST = NICKNAME_POOL.length;
