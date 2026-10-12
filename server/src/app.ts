import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { createApiRouter } from './routes';

export function createApp() {
  const app = express();

  // Render puts a proxy in front of the app; needed to see the real visitor IP
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', createApiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
