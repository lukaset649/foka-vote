import { Router } from 'express';
import { getOne, list, verifyAccess } from './controller.js';

export const contestsRoutes = Router();

contestsRoutes.get('/', list);
contestsRoutes.get('/:slug', getOne);
contestsRoutes.post('/:slug/access', verifyAccess);
