import { Router } from 'express';
import { getOne, list } from './controller.js';

export const contestsRoutes = Router();

contestsRoutes.get('/', list);
contestsRoutes.get('/:slug', getOne);
