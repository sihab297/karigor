import { Router } from 'express';
import { getTechnicianNid } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/technicians/:userId/nid', getTechnicianNid);
