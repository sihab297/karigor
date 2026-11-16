import { Router } from 'express';
import { create } from '../controllers/booking.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';

export const bookingRouter = Router();

bookingRouter.post('/', requireAuth, requireRole('customer'), create);
