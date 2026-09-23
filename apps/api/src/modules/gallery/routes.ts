import { Router } from 'express';
import { MAX_PHOTOS_PER_ALBUM_UPLOAD } from '@foka-vote/shared';
import { uploadArtworks } from '../../lib/upload.js';
import { addPhotos, create, getOne, list, verifyAccess } from './controller.js';
import { requireGalleryAccess } from './require-gallery-access.middleware.js';

export const galleryRoutes = Router();

galleryRoutes.post('/access', verifyAccess);
galleryRoutes.get('/albums', list);
galleryRoutes.post('/albums', requireGalleryAccess, create);
galleryRoutes.get('/albums/:slug', getOne);
galleryRoutes.post(
  '/albums/:slug/photos',
  requireGalleryAccess,
  uploadArtworks('photos', MAX_PHOTOS_PER_ALBUM_UPLOAD),
  addPhotos,
);
