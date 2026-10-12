import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, me, register } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/require-auth';

export function createAuthRouter() {
  const router = Router();

  const limitAttempts = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many attempts. Please wait a few minutes and try again.',
        },
      });
    },
  });

  router.post('/register', limitAttempts, register);
  router.post('/login', limitAttempts, login);
  router.get('/me', requireAuth, me);

  return router;
}
