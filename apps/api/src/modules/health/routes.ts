import { Router } from 'express';
import { getHealth } from './controller.js';

export const healthRoutes = Router();

healthRoutes.get('/', getHealth);
