import { Router } from 'express';
import { adminRoutes } from './modules/admin/routes.js';
import { contestsRoutes } from './modules/contests/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { votesRoutes } from './modules/votes/routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/contests', contestsRoutes);
apiRouter.use('/votes', votesRoutes);
apiRouter.use('/admin', adminRoutes);
