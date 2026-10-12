import { Router } from 'express';
import { createAuthRouter } from './auth.routes';
import { healthRouter } from './health.routes';
import { technicianRouter } from './technician.routes';
import { adminRouter } from './admin.routes';

export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter());
  router.use('/technicians', technicianRouter);
  router.use('/admin', adminRouter);

  return router;
}
