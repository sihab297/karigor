import type { RequestHandler } from 'express';
import {
  analyzeAndSave,
  checkHourlyLimit,
  findReport,
  reportView,
  setFinalService,
  type Photo,
} from '../services/problem.service';
import { findMatches } from '../services/matching.service';
import { AppError } from '../utils/app-error';
import { detectImageType } from '../utils/image-type';
import { analyzeSchema, finalServiceSchema, matchSchema } from '../validators/problem.validators';

// runs before the photos are read, so a customer over the limit doesn't upload anything
export const limitChecks: RequestHandler = async (req, _res, next) => {
  await checkHourlyLimit(req.user!._id);
  next();
};

function readPhotos(files: Express.Multer.File[]): Photo[] {
  return files.map((file) => {
    const type = detectImageType(file.buffer);
    if (!type) throw new AppError(400, 'WRONG_FILE_TYPE', 'Use a JPG or PNG photo.');
    return { buffer: file.buffer, mimeType: type === 'png' ? 'image/png' : 'image/jpeg' };
  });
}

export const analyze: RequestHandler = async (req, res) => {
  const fields = analyzeSchema.parse(req.body ?? {});
  const photos = readPhotos(Array.isArray(req.files) ? req.files : []);
  const report = await analyzeAndSave(req.user!._id, fields, photos);
  res.status(201).json({ data: { report: reportView(report) } });
};

export const getProblem: RequestHandler = async (req, res) => {
  const report = await findReport(String(req.params.id), req.user!);
  res.json({ data: { report: reportView(report) } });
};

export const changeService: RequestHandler = async (req, res) => {
  const { finalServiceId } = finalServiceSchema.parse(req.body ?? {});
  const report = await setFinalService(String(req.params.id), req.user!, finalServiceId);
  res.json({ data: { report: reportView(report) } });
};

export const matches: RequestHandler = async (req, res) => {
  const input = matchSchema.parse(req.body ?? {});
  res.json({ data: await findMatches(String(req.params.id), req.user!, input) });
};
