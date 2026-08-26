import { Router } from 'express';
import { resultsRoutes } from '../results/routes.js';
import { submissionsRoutes } from '../submissions/routes.js';
import { votesRoutes } from '../votes/routes.js';
import { getOne, list, verifyAccess } from './controller.js';

export const contestsRoutes = Router();

contestsRoutes.get('/', list);
contestsRoutes.get('/:slug', getOne);
contestsRoutes.post('/:slug/access', verifyAccess);
contestsRoutes.use('/:slug/submissions', submissionsRoutes);
contestsRoutes.use('/:slug/votes', votesRoutes);
contestsRoutes.use('/:slug/results', resultsRoutes);
