import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../utils/app-error';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function photoParser(maxCount: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: maxCount },
    fileFilter: (_req, file, done) => {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') done(null, true);
      else done(new AppError(400, 'WRONG_FILE_TYPE', 'Use a JPG or PNG photo.'));
    },
  });
}

function uploadError(error: MulterError, field: string, maxCount: number) {
  const one = maxCount === 1;
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(
      400,
      'FILE_TOO_LARGE',
      one ? 'The photo must be 5 MB or smaller.' : 'Each photo must be 5 MB or smaller.',
    );
  }
  if (error.code === 'LIMIT_FILE_COUNT' || error.field === field) {
    return new AppError(
      400,
      'TOO_MANY_FILES',
      one ? 'Send one photo at a time.' : `Send up to ${maxCount} photos.`,
    );
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'WRONG_FIELD', `Send the photo in the "${field}" field.`);
  }
  return new AppError(400, 'UPLOAD_ERROR', 'The photo could not be read.');
}

function withClearErrors(parse: RequestHandler, field: string, maxCount: number): RequestHandler {
  return (req, res, next) => {
    parse(req, res, (error?: unknown) => {
      next(error instanceof MulterError ? uploadError(error, field, maxCount) : error);
    });
  };
}

export const uploadOnePhoto = withClearErrors(photoParser(1).single('photo'), 'photo', 1);

export const MAX_PROBLEM_PHOTOS = 3;
export const uploadPhotos = withClearErrors(
  photoParser(MAX_PROBLEM_PHOTOS).array('photos', MAX_PROBLEM_PHOTOS),
  'photos',
  MAX_PROBLEM_PHOTOS,
);
