import { Router } from 'express';
import { create, list, remove, update } from './controller.js';

export const adminContestTopicsRoutes = Router();

adminContestTopicsRoutes.get('/', list);
adminContestTopicsRoutes.post('/', create);
adminContestTopicsRoutes.patch('/:id', update);
adminContestTopicsRoutes.delete('/:id', remove);
