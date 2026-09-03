import { Router } from 'express';
import { uploadArtworks } from '../../lib/upload.js';
import { create, list, reserveAliasHandler } from './controller.js';

const MAX_UPLOAD_FILES = 20;

export const submissionsRoutes = Router({ mergeParams: true });

submissionsRoutes.get('/', list);
submissionsRoutes.post('/', uploadArtworks('artworks', MAX_UPLOAD_FILES), create);
submissionsRoutes.post('/alias-reservations', reserveAliasHandler);
