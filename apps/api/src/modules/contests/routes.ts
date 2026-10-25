import { Router } from 'express';
import { uploadArtworks } from '../../lib/upload.js';
import { resultsRoutes } from '../results/routes.js';
import { removeUpload, uploadArtwork } from '../submissions/controller.js';
import { submissionsRoutes } from '../submissions/routes.js';
import { votesRoutes } from '../votes/routes.js';
import { getOne, list, verifyAccess } from './controller.js';

export const contestsRoutes = Router();

contestsRoutes.get('/', list);
contestsRoutes.get('/:slug', getOne);
contestsRoutes.post('/:slug/access', verifyAccess);
contestsRoutes.post('/:slug/uploads', uploadArtworks('photo', 1), uploadArtwork);
contestsRoutes.delete('/:slug/uploads/:uploadId', removeUpload);
contestsRoutes.use('/:slug/submissions', submissionsRoutes);
contestsRoutes.use('/:slug/votes', votesRoutes);
contestsRoutes.use('/:slug/results', resultsRoutes);
