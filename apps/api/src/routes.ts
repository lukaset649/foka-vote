import { Router } from 'express';
import { healthRoutes } from './modules/health/routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
