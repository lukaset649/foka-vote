import { Router } from 'express';
import { list, unvoidCard, voidCard } from './controller.js';

export const adminVoteCardsRoutes = Router({ mergeParams: true });

adminVoteCardsRoutes.get('/', list);
adminVoteCardsRoutes.post('/:cardId/void', voidCard);
adminVoteCardsRoutes.post('/:cardId/unvoid', unvoidCard);
