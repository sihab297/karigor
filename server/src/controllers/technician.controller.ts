import type { RequestHandler } from 'express';
import {
  getMyProfile,
  saveMyProfile,
  saveNidPhoto,
  setAvailability,
} from '../services/technician-profile.service';
import { AppError } from '../utils/app-error';
import { detectImageType } from '../utils/image-type';
import { availabilitySchema, profileSchema } from '../validators/technician.validators';

export const getProfile: RequestHandler = async (req, res) => {
  const profile = await getMyProfile(req.user!._id);
  res.json({ data: { profile } });
};

export const saveProfile: RequestHandler = async (req, res) => {
  const profile = await saveMyProfile(req.user!._id, profileSchema.parse(req.body ?? {}));
  res.json({ data: { profile } });
};

export const updateAvailability: RequestHandler = async (req, res) => {
  const { acceptingJobs } = availabilitySchema.parse(req.body ?? {});
  const profile = await setAvailability(req.user!._id, acceptingJobs);
  res.json({ data: { profile } });
};

export const uploadNid: RequestHandler = async (req, res) => {
  if (!req.file) throw new AppError(400, 'NO_PHOTO', 'Choose a photo of your NID.');
  if (!detectImageType(req.file.buffer)) {
    throw new AppError(400, 'WRONG_FILE_TYPE', 'Use a JPG or PNG photo.');
  }
  const profile = await saveNidPhoto(req.user!._id, req.file.buffer);
  res.json({ data: { profile } });
};
