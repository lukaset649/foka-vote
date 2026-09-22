import { Router } from 'express';
import { list, verifyAccess } from './controller.js';

export const galleryRoutes = Router();

galleryRoutes.post('/access', verifyAccess);
galleryRoutes.get('/albums', list);
