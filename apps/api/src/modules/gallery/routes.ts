import { Router } from 'express';
import { create, list, verifyAccess } from './controller.js';
import { requireGalleryAccess } from './require-gallery-access.middleware.js';

export const galleryRoutes = Router();

galleryRoutes.post('/access', verifyAccess);
galleryRoutes.get('/albums', list);
galleryRoutes.post('/albums', requireGalleryAccess, create);
