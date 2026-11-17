import { Router } from 'express';
import { changeStatus, create, getOne, list, messages } from '../controllers/booking.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';

export const bookingRouter = Router();

const people = [requireAuth, requireRole('customer', 'technician')];

bookingRouter.post('/', requireAuth, requireRole('customer'), create);
bookingRouter.get('/', ...people, list);
bookingRouter.get('/:id', requireAuth, requireRole('customer', 'technician', 'admin'), getOne);
bookingRouter.patch('/:id/status', ...people, changeStatus);
bookingRouter.get('/:id/messages', ...people, messages);
