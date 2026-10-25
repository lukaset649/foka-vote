import { Router } from 'express';
import { uploadArtworks } from '../../lib/upload.js';
import {
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
galleryRoutes.post('/albums/:slug/uploads', uploadArtworks('photo', 1), uploadPhoto);
galleryRoutes.delete('/albums/:slug/uploads/:uploadId', removeUpload);
galleryRoutes.post('/albums/:slug/submissions', createSubmission);
