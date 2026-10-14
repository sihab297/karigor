import { Router } from 'express';
import { getAreas, getQuickPicks, getServices } from '../controllers/catalog.controller';

export const catalogRouter = Router();

catalogRouter.get('/services', getServices);
catalogRouter.get('/services/:id/quick-picks', getQuickPicks);
catalogRouter.get('/areas', getAreas);
