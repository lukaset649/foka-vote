import { Router } from 'express';
import { verifyAccess } from './controller.js';

export const galleryRoutes = Router();

galleryRoutes.post('/access', verifyAccess);
