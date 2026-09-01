import { Router } from 'express';
import { adminSubmissionsRoutes } from '../submissions/routes.js';
import { adminVoteCardsRoutes } from '../vote-cards/routes.js';
import { create, getOne, list, remove, update } from './controller.js';

export const adminContestsRoutes = Router();

adminContestsRoutes.post('/', create);
adminContestsRoutes.get('/', list);
adminContestsRoutes.get('/:id', getOne);
adminContestsRoutes.patch('/:id', update);
adminContestsRoutes.delete('/:id', remove);
adminContestsRoutes.use('/:contestId/submissions', adminSubmissionsRoutes);
adminContestsRoutes.use('/:contestId/vote-cards', adminVoteCardsRoutes);
