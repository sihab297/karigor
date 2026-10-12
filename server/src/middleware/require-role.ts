import type { RequestHandler } from 'express';
import type { UserRole } from '../models/user.model';
import { AppError } from '../utils/app-error';

// use after requireAuth, e.g. router.get('/admin/stats', requireAuth, requireRole('admin'), ...)
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'NOT_LOGGED_IN', 'Please log in first.');
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'NOT_ALLOWED', "You don't have permission to do this.");
    }
    next();
  };
}
