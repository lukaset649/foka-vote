import { Router } from 'express';
import {
  getOne,
  getSettings,
  list,
  remove,
  setContestVisibility,
  setStatus,
  setVisibility,
  update,
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

adminGalleryRoutes.patch('/contests/:contestId/visibility', setContestVisibility);
