import { z } from 'zod';
import { BD_PHONE_REGEX, normalizeBdPhone } from '../utils/phone';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name is too short')
    .max(80, 'Name is too long'),
  phone: z
    .string({ error: 'Phone number is required' })
    .transform(normalizeBdPhone)
    .refine((phone) => BD_PHONE_REGEX.test(phone), 'Enter a mobile number like 01712345678'),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().pipe(z.email('Email is not valid')).optional(),
  ),
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    // bcrypt only uses the first 72 bytes
    .refine((password) => Buffer.byteLength(password) <= 72, 'Password is too long'),
  role: z.enum(['customer', 'technician'], { error: 'Choose customer or technician' }),
});

export const loginSchema = z.object({
  phoneOrEmail: z
    .string({ error: 'Phone or email is required' })
    .trim()
    .min(1, 'Phone or email is required'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
