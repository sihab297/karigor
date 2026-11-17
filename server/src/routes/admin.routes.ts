import { Router } from 'express';
import {
  getStats,
  getTechnicianNid,
  getTechnicians,
  setTechnicianApproval,
} from '../controllers/admin.controller';
import {
  deletePriceItem,
  deleteSkill,
  getCatalog,
  patchPriceItem,
  patchSafetyTip,
  patchService,
  patchSkill,
  postPriceItem,
  postSkill,
} from '../controllers/catalog-admin.controller';
import { requireAuth } from '../middleware/require-auth';
import { requireRole } from '../middleware/require-role';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/stats', getStats);
adminRouter.get('/technicians', getTechnicians);
adminRouter.get('/technicians/:userId/nid', getTechnicianNid);
adminRouter.patch('/technicians/:userId/approval', setTechnicianApproval);

// the catalog: services, skills, price list and safety steps
adminRouter.get('/catalog', getCatalog);
adminRouter.patch('/services/:id', patchService);
adminRouter.post('/services/:id/skills', postSkill);
adminRouter.patch('/services/:id/skills/:skillId', patchSkill);
adminRouter.delete('/services/:id/skills/:skillId', deleteSkill);
adminRouter.post('/price-items', postPriceItem);
adminRouter.patch('/price-items/:id', patchPriceItem);
adminRouter.delete('/price-items/:id', deletePriceItem);
adminRouter.patch('/safety-tips/:id', patchSafetyTip);
