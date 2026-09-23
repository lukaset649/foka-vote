import { Router } from 'express';
import {
  getOne,
  getSettings,
  list,
  listPhotos,
  remove,
  removePhoto,
  setContestVisibility,
  setPhotoStatus,
  setStatus,
  setVisibility,
  update,
  updatePhoto,
  updateSettings,
} from './controller.js';

export const adminGalleryRoutes = Router();

adminGalleryRoutes.get('/settings', getSettings);
adminGalleryRoutes.patch('/settings', updateSettings);

adminGalleryRoutes.get('/albums', list);
adminGalleryRoutes.get('/albums/:id', getOne);
adminGalleryRoutes.patch('/albums/:id', update);
adminGalleryRoutes.patch('/albums/:id/status', setStatus);
adminGalleryRoutes.patch('/albums/:id/visibility', setVisibility);
adminGalleryRoutes.delete('/albums/:id', remove);

adminGalleryRoutes.get('/albums/:id/photos', listPhotos);
adminGalleryRoutes.patch('/albums/:id/photos/:photoId', updatePhoto);
adminGalleryRoutes.patch('/albums/:id/photos/:photoId/status', setPhotoStatus);
adminGalleryRoutes.delete('/albums/:id/photos/:photoId', removePhoto);

adminGalleryRoutes.patch('/contests/:contestId/visibility', setContestVisibility);
