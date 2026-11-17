import type { RequestHandler } from 'express';
import {
  addPriceItem,
  addSkill,
  getAdminCatalog,
  removePriceItem,
  removeSkill,
  renameSkill,
  updatePriceItem,
  updateSafetyTip,
  updateService,
} from '../services/catalog-admin.service';
import {
  priceItemCreateSchema,
  priceItemUpdateSchema,
  safetyTipUpdateSchema,
  serviceUpdateSchema,
  skillSchema,
} from '../validators/catalog-admin.validators';

const param = (value: unknown) => String(value);

export const getCatalog: RequestHandler = async (_req, res) => {
  res.json({ data: await getAdminCatalog() });
};

export const patchService: RequestHandler = async (req, res) => {
  const input = serviceUpdateSchema.parse(req.body ?? {});
  res.json({ data: await updateService(param(req.params.id), input) });
};

export const postSkill: RequestHandler = async (req, res) => {
  const { name } = skillSchema.parse(req.body ?? {});
  res.status(201).json({ data: await addSkill(param(req.params.id), name) });
};

export const patchSkill: RequestHandler = async (req, res) => {
  const { name } = skillSchema.parse(req.body ?? {});
  res.json({ data: await renameSkill(param(req.params.id), param(req.params.skillId), name) });
};

export const deleteSkill: RequestHandler = async (req, res) => {
  res.json({ data: await removeSkill(param(req.params.id), param(req.params.skillId)) });
};

export const postPriceItem: RequestHandler = async (req, res) => {
  const input = priceItemCreateSchema.parse(req.body ?? {});
  res.status(201).json({ data: await addPriceItem(input) });
};

export const patchPriceItem: RequestHandler = async (req, res) => {
  const input = priceItemUpdateSchema.parse(req.body ?? {});
  res.json({ data: await updatePriceItem(param(req.params.id), input) });
};

export const deletePriceItem: RequestHandler = async (req, res) => {
  await removePriceItem(param(req.params.id));
  res.status(204).end();
};

export const patchSafetyTip: RequestHandler = async (req, res) => {
  const input = safetyTipUpdateSchema.parse(req.body ?? {});
  res.json({ data: await updateSafetyTip(param(req.params.id), input) });
};
