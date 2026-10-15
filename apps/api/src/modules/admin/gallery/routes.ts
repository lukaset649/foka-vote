import { Router } from 'express';
import {
  create,
  getOne,
  list,
  listPhotos,
  remove,
  removePhoto,
  setContestVisibility,
  setPhotoStatus,
  setVisibility,
  update,
  updatePhoto,
} from './controller.js';

export const adminGalleryRoutes = Router();

adminGalleryRoutes.get('/albums', list);
adminGalleryRoutes.post('/albums', create);
adminGalleryRoutes.get('/albums/:id', getOne);
adminGalleryRoutes.patch('/albums/:id', update);
adminGalleryRoutes.patch('/albums/:id/visibility', setVisibility);
adminGalleryRoutes.delete('/albums/:id', remove);

adminGalleryRoutes.get('/albums/:id/photos', listPhotos);
adminGalleryRoutes.patch('/albums/:id/photos/:photoId', updatePhoto);
adminGalleryRoutes.patch('/albums/:id/photos/:photoId/status', setPhotoStatus);
adminGalleryRoutes.delete('/albums/:id/photos/:photoId', removePhoto);

adminGalleryRoutes.patch('/contests/:contestId/visibility', setContestVisibility);
