import { Router } from 'express';
import { login, logout, me } from './controller.js';
import { adminContestsRoutes } from './contests/routes.js';
import { adminGalleryRoutes } from './gallery/routes.js';
import { requireAdmin } from './require-admin.middleware.js';

export const adminRoutes = Router();

adminRoutes.post('/login', login);
adminRoutes.post('/logout', logout);

adminRoutes.use(requireAdmin);

adminRoutes.get('/me', me);
adminRoutes.use('/contests', adminContestsRoutes);
adminRoutes.use('/gallery', adminGalleryRoutes);
