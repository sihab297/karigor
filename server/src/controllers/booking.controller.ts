import type { RequestHandler } from 'express';
import { changeBookingStatus, createBooking } from '../services/booking.service';
import { changeStatusSchema, createBookingSchema } from '../validators/booking.validators';

export const create: RequestHandler = async (req, res) => {
  const input = createBookingSchema.parse(req.body ?? {});
  res.status(201).json({ data: await createBooking(req.user!, input) });
};

export const changeStatus: RequestHandler = async (req, res) => {
  const input = changeStatusSchema.parse(req.body ?? {});
  res.json({ data: await changeBookingStatus(String(req.params.id), req.user!, input) });
};
