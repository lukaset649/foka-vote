import { Router } from 'express';
import { uploadArtworks } from '../../lib/upload.js';
import { create } from './controller.js';

const MAX_UPLOAD_FILES = 20;

export const submissionsRoutes = Router({ mergeParams: true });

submissionsRoutes.post('/', uploadArtworks('artworks', MAX_UPLOAD_FILES), create);
