import { isValidObjectId, type Types } from 'mongoose';
import { findService } from '../ai/catalog';
import type { AnalyzeOutcome } from '../ai/gemini';
import { env } from '../config/env';
import { ProblemReportModel, type ProblemReportDocument } from '../models/problem-report.model';
import { ServiceModel } from '../models/service.model';
import type { UserDocument } from '../models/user.model';
import { AppError, fieldError } from '../utils/app-error';
import type { AnalyzeFields } from '../validators/problem.validators';
import { analyzeWithAi } from './ai.service';
import { loadAiCatalog } from './catalog.service';
import { problemPhotoUrls, uploadProblemPhotos } from './problem-photos';

const HOUR_MS = 60 * 60 * 1000;

export interface Photo {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png';
}

export async function checkHourlyLimit(customerId: Types.ObjectId, limit = env.AI_CHECKS_PER_HOUR) {
  const recent = await ProblemReportModel.find({
    customerId,
    createdAt: { $gte: new Date(Date.now() - HOUR_MS) },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('createdAt');
  if (recent.length < limit) return;

  const freeAt = recent[0]!.createdAt.getTime() + HOUR_MS;
  const minutes = Math.max(1, Math.ceil((freeAt - Date.now()) / 60_000));
  throw new AppError(
    429,
    'TOO_MANY_CHECKS',
    `You have checked ${limit} problems in the last hour. Please try again in ${minutes} min.`,
  );
}

// if the AI fails, the customer can still choose the service and carry on
async function runAi(...args: Parameters<typeof analyzeWithAi>) {
  try {
    return { outcome: await analyzeWithAi(...args) };
  } catch (error) {
    if (!(error instanceof AppError)) console.error('AI check failed:', error);
    const code = error instanceof AppError ? error.code : 'AI_FAILED';
    return { outcome: null, aiError: code };
  }
}

function savedAnalysis(outcome: AnalyzeOutcome | null) {
  if (!outcome) return null;
  return { ...outcome.result, model: outcome.model, latencyMs: outcome.latencyMs };
}

export async function analyzeAndSave(
  customerId: Types.ObjectId,
  fields: AnalyzeFields,
  photos: Photo[],
) {
  if (!fields.text && photos.length === 0) {
    throw fieldError('text', 'Tell us the problem or add a photo');
  }

  const catalog = await loadAiCatalog();
  if (fields.chosenServiceId && !findService(catalog, fields.chosenServiceId)) {
    throw fieldError('chosenServiceId', "We don't offer this service");
  }

  const photoIds = await uploadProblemPhotos(photos.map((photo) => photo.buffer));
  const input = {
    text: fields.text,
    chosenServiceId: fields.chosenServiceId,
    images: photos.map((photo) => ({
      mimeType: photo.mimeType,
      base64: photo.buffer.toString('base64'),
    })),
  };
  const { outcome, aiError } = await runAi(input, catalog);

  return ProblemReportModel.create({
    customerId,
    mode: fields.chosenServiceId ? 'quick' : 'describe',
    chosenServiceId: fields.chosenServiceId,
    text: fields.text,
    photoIds,
    ai: savedAnalysis(outcome),
    aiError,
  });
}

// a report that isn't yours looks the same as one that doesn't exist
export async function findReport(id: string, user: UserDocument, { ownerOnly = false } = {}) {
  const report = isValidObjectId(id) ? await ProblemReportModel.findById(id) : null;
  const isOwner = report?.customerId.equals(user._id);
  const isAdmin = user.role === 'admin' && !ownerOnly;
  if (!report || !(isOwner || isAdmin)) {
    throw new AppError(404, 'PROBLEM_NOT_FOUND', "We couldn't find this problem.");
  }
  return report;
}

export async function setFinalService(id: string, user: UserDocument, finalServiceId: string) {
  const report = await findReport(id, user, { ownerOnly: true });
  if (!(await ServiceModel.exists({ _id: finalServiceId, active: true }))) {
    throw fieldError('finalServiceId', "We don't offer this service");
  }
  report.finalServiceId = finalServiceId;
  return report.save();
}

export function reportView(report: ProblemReportDocument) {
  return { ...report.toJSON(), photoUrls: problemPhotoUrls(report.photoIds) };
}
