import multer from 'multer';
import { AppError } from '../utils/app-error';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const uploadOnePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, done) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') done(null, true);
    else done(new AppError(400, 'WRONG_FILE_TYPE', 'Use a JPG or PNG photo.'));
  },
}).single('photo');
