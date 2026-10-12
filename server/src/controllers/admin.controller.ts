import type { RequestHandler } from 'express';
import { getNidPhotoLink } from '../services/technician-profile.service';

export const getTechnicianNid: RequestHandler = async (req, res) => {
  const link = await getNidPhotoLink(String(req.params.userId));
  res.json({ data: link });
};
