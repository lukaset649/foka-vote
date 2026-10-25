import { Router } from 'express';
import { create, list, reserveAliasHandler } from './controller.js';

export const submissionsRoutes = Router({ mergeParams: true });

submissionsRoutes.get('/', list);
submissionsRoutes.post('/', create);
submissionsRoutes.post('/alias-reservations', reserveAliasHandler);
