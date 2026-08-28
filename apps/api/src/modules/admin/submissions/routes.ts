import { Router } from 'express';
import { getOne, list, remove } from './controller.js';

export const adminSubmissionsRoutes = Router({ mergeParams: true });

adminSubmissionsRoutes.get('/', list);
adminSubmissionsRoutes.get('/:submissionId', getOne);
adminSubmissionsRoutes.delete('/:submissionId', remove);
