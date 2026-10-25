import { Router } from 'express';
import { MAX_PHOTOS_PER_ALBUM_UPLOAD } from '@foka-vote/shared';
import { uploadArtworks } from '../../lib/upload.js';
import {
  addPhotos,
  createSubmission,
  getOne,
  list,
  removeUpload,
  uploadPhoto,
  verifyAccess,
} from './controller.js';

export const galleryRoutes = Router();

galleryRoutes.get('/albums', list);
galleryRoutes.get('/albums/:slug', getOne);
galleryRoutes.post('/albums/:slug/access', verifyAccess);
galleryRoutes.post(
  '/albums/:slug/photos',
  uploadArtworks('photos', MAX_PHOTOS_PER_ALBUM_UPLOAD),
  addPhotos,
);
galleryRoutes.post('/albums/:slug/uploads', uploadArtworks('photo', 1), uploadPhoto);
galleryRoutes.delete('/albums/:slug/uploads/:uploadId', removeUpload);
galleryRoutes.post('/albums/:slug/submissions', createSubmission);
