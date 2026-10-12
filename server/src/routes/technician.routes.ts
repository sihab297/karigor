import { Router } from 'express';
import {
  getProfile,
  saveProfile,
  updateAvailability,
  uploadNid,
} from '../controllers/technician.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';
import { uploadOnePhoto } from '../middleware/upload-photo';

export const technicianRouter = Router();

const technicianOnly = [requireAuth, requireRole('technician')];

technicianRouter.get('/me/profile', ...technicianOnly, getProfile);
technicianRouter.put('/me/profile', ...technicianOnly, saveProfile);
technicianRouter.patch('/me/availability', ...technicianOnly, updateAvailability);
// check the login before reading the file, so strangers can't upload
technicianRouter.post('/me/nid', ...technicianOnly, uploadOnePhoto, uploadNid);
