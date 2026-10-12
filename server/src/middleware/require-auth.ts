import type { RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';
import { UserModel } from '../models/user.model';
import { BLOCKED_MESSAGE } from '../services/auth.service';
import { AppError } from '../utils/app-error';
import { readToken } from '../utils/jwt';

const EXPIRED = 'Your login has expired. Please log in again.';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new AppError(401, 'NOT_LOGGED_IN', 'Please log in first.');

  let userId: string;
  try {
    userId = readToken(token).userId;
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', EXPIRED);
  }

  // load the user every time, so a block or role change works straight away
  const user = isValidObjectId(userId) ? await UserModel.findById(userId) : null;
  if (!user) throw new AppError(401, 'INVALID_TOKEN', EXPIRED);
  if (user.status === 'blocked') throw new AppError(403, 'ACCOUNT_BLOCKED', BLOCKED_MESSAGE);

  req.user = user;
  next();
};
