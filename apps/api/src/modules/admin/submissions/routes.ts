import { Router } from 'express';
import {
  getOne,
  list,
  remove,
  removeArtwork,
  reorder,
  update,
  updateArtworkTitle,
} from './controller.js';

export const adminSubmissionsRoutes = Router({ mergeParams: true });

adminSubmissionsRoutes.get('/', list);
adminSubmissionsRoutes.get('/:submissionId', getOne);
adminSubmissionsRoutes.patch('/:submissionId', update);
adminSubmissionsRoutes.delete('/:submissionId', remove);
adminSubmissionsRoutes.patch('/:submissionId/artworks/order', reorder);
adminSubmissionsRoutes.patch('/:submissionId/artworks/:artworkId', updateArtworkTitle);
adminSubmissionsRoutes.delete('/:submissionId/artworks/:artworkId', removeArtwork);
