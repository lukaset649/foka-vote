import { Router } from 'express';
import { getResults } from './controller.js';

export const resultsRoutes = Router({ mergeParams: true });

resultsRoutes.get('/', getResults);
