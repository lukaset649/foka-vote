import { Router } from 'express';
import { create, getOne, list, update } from './controller.js';

export const adminContestsRoutes = Router();

adminContestsRoutes.post('/', create);
adminContestsRoutes.get('/', list);
adminContestsRoutes.get('/:id', getOne);
adminContestsRoutes.patch('/:id', update);
