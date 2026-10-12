import { Router } from 'express';
import {
  getTechnicianNid,
  getTechnicians,
  setTechnicianApproval,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/technicians', getTechnicians);
adminRouter.get('/technicians/:userId/nid', getTechnicianNid);
adminRouter.patch('/technicians/:userId/approval', setTechnicianApproval);
