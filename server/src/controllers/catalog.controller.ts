import type { RequestHandler } from 'express';
import { listAreas, listServices } from '../services/catalog.service';

export const getServices: RequestHandler = async (_req, res) => {
  res.json({ data: { services: await listServices() } });
};

export const getAreas: RequestHandler = (_req, res) => {
  res.json({ data: { areas: listAreas() } });
};
