import { Router } from 'express';
import { getProfile, saveProfile, updateAvailability } from '../controllers/technician.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';

export const technicianRouter = Router();

technicianRouter.get('/me/profile', requireAuth, requireRole('technician'), getProfile);
technicianRouter.put('/me/profile', requireAuth, requireRole('technician'), saveProfile);
technicianRouter.patch(
  '/me/availability',
  requireAuth,
  requireRole('technician'),
  updateAvailability,
);
