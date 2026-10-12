import { Router } from 'express';
import { getAreas, getServices } from '../controllers/catalog.controller';

export const catalogRouter = Router();

catalogRouter.get('/services', getServices);
catalogRouter.get('/areas', getAreas);
