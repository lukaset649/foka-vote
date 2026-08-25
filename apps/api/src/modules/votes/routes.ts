import { Router } from 'express';
import { create, getMine } from './controller.js';

export const votesRoutes = Router({ mergeParams: true });

votesRoutes.get('/me', getMine);
votesRoutes.post('/', create);
