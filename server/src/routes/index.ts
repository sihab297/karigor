import { Router } from 'express';
import { createAuthRouter } from './auth.routes';
import { healthRouter } from './health.routes';

export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter());

  return router;
}
