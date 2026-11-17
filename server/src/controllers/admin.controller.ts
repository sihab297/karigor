import type { RequestHandler } from 'express';
import { getAdminStats } from '../services/admin-stats.service';
import { listAllBookings, listUsers, setUserStatus } from '../services/admin-people.service';
import { listTechnicians, reviewTechnician } from '../services/admin-technician.service';
import { getNidPhotoLink } from '../services/technician-profile.service';
import {
  approvalSchema,
  technicianListQuery,
  adminBookingsQuery,
  adminUsersQuery,
  userStatusSchema,
} from '../validators/admin.validators';

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

export const getStats: RequestHandler = async (_req, res) => {
  res.json({ data: await getAdminStats() });
};

export const getBookings: RequestHandler = async (req, res) => {
  res.json({ data: await listAllBookings(adminBookingsQuery.parse(req.query)) });
};

export const getUsers: RequestHandler = async (req, res) => {
  res.json({ data: await listUsers(adminUsersQuery.parse(req.query)) });
};

export const setUserStatusHandler: RequestHandler = async (req, res) => {
  const { status } = userStatusSchema.parse(req.body ?? {});
  res.json({ data: await setUserStatus(String(req.params.id), status, req.user!) });
};
