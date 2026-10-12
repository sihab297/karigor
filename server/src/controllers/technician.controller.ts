import type { RequestHandler } from 'express';
import {
  getMyProfile,
  saveMyProfile,
  setAvailability,
} from '../services/technician-profile.service';
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
