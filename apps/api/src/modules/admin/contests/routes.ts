import { Router } from 'express';
import { adminSubmissionsRoutes } from '../submissions/routes.js';
import { create, getOne, list, update } from './controller.js';

export const adminContestsRoutes = Router();

adminContestsRoutes.post('/', create);
adminContestsRoutes.get('/', list);
adminContestsRoutes.get('/:id', getOne);
adminContestsRoutes.patch('/:id', update);
adminContestsRoutes.use('/:contestId/submissions', adminSubmissionsRoutes);
