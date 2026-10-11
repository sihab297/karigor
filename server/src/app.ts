import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { apiRouter } from './routes';

export interface AppOptions {
  clientUrl: string;
}

export function createApp({ clientUrl }: AppOptions) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: clientUrl }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
