import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';

const uploadMessages: Partial<Record<MulterError['code'], [string, string]>> = {
  LIMIT_FILE_SIZE: ['FILE_TOO_LARGE', 'The photo must be 5 MB or smaller.'],
  LIMIT_FILE_COUNT: ['TOO_MANY_FILES', 'Send one photo at a time.'],
  LIMIT_UNEXPECTED_FILE: ['WRONG_FIELD', 'Send the photo in the "photo" field.'],
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof MulterError) {
    const [code, message] = uploadMessages[err.code] ?? [
      'UPLOAD_ERROR',
      'The photo could not be read.',
    ];
    res.status(400).json({ error: { code, message } });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err?.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } });
};
