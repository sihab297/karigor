import { z } from 'zod';

const MISSING = 'is missing. Copy .env.example to .env and fill it in.';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  MONGODB_URI: z.string({ error: MISSING }).min(1, MISSING),
  JWT_SECRET: z.string({ error: MISSING }).min(32, 'must be at least 32 characters long'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODELS: z
    .string()
    .default('gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite')
    .transform((list) =>
      list
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `- ${issue.path.join('.')} ${issue.message}`);
    throw new Error(`Invalid settings in .env:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

export const env = loadEnv();
