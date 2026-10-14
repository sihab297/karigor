import { Router } from 'express';
import {
  analyze,
  changeService,
  getProblem,
  limitChecks,
  matches,
} from '../controllers/problem.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';
import { uploadPhotos } from '../middleware/upload-photo';

export const problemRouter = Router();

const customerOnly = [requireAuth, requireRole('customer')];

problemRouter.post('/analyze', ...customerOnly, limitChecks, uploadPhotos, analyze);
problemRouter.get('/:id', requireAuth, requireRole('customer', 'admin'), getProblem);
problemRouter.patch('/:id', ...customerOnly, changeService);
problemRouter.post('/:id/matches', ...customerOnly, matches);
