import type { RequestHandler } from 'express';
import { listTechnicians, reviewTechnician } from '../services/admin-technician.service';
import { getNidPhotoLink } from '../services/technician-profile.service';
import { approvalSchema, technicianListQuery } from '../validators/admin.validators';

export const getTechnicians: RequestHandler = async (req, res) => {
  const { status } = technicianListQuery.parse(req.query);
  res.json({ data: await listTechnicians(status) });
};

export const getTechnicianNid: RequestHandler = async (req, res) => {
  const link = await getNidPhotoLink(String(req.params.userId));
  res.json({ data: link });
};

export const setTechnicianApproval: RequestHandler = async (req, res) => {
  const technician = await reviewTechnician(
    req.user!._id,
    String(req.params.userId),
    approvalSchema.parse(req.body ?? {}),
  );
  res.json({ data: { technician } });
};
