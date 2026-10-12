import type { RequestHandler } from 'express';
import { loginUser, registerUser } from '../services/auth.service';
import { loginSchema, registerSchema } from '../validators/auth.validators';

export const register: RequestHandler = async (req, res) => {
  const result = await registerUser(registerSchema.parse(req.body ?? {}));
  res.status(201).json({ data: result });
};

export const login: RequestHandler = async (req, res) => {
  const result = await loginUser(loginSchema.parse(req.body ?? {}));
  res.json({ data: result });
};

export const me: RequestHandler = (req, res) => {
  res.json({ data: { user: req.user } });
};
