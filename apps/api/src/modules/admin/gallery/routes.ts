import { Router } from 'express';
import { getSettings, updateSettings } from './controller.js';

export const adminGalleryRoutes = Router();

adminGalleryRoutes.get('/settings', getSettings);
adminGalleryRoutes.patch('/settings', updateSettings);
