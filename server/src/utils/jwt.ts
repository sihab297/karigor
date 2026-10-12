import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../models/user.model';

const TOKEN_LIFETIME = '7d';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export function createToken(userId: string, role: UserRole): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: TOKEN_LIFETIME,
    algorithm: 'HS256',
  });
}

export function readToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || !payload.sub) throw new Error('Token has no user');
  return { userId: payload.sub, role: payload.role as UserRole };
}
