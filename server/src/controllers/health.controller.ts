import type { RequestHandler } from 'express';

export const getHealth: RequestHandler = (_req, res) => {
  res.json({ data: { status: 'ok', service: 'karigor-api', time: new Date().toISOString() } });
};
