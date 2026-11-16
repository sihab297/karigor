import type { RequestHandler } from 'express';
import { createBooking } from '../services/booking.service';
import { createBookingSchema } from '../validators/booking.validators';

export const create: RequestHandler = async (req, res) => {
  const input = createBookingSchema.parse(req.body ?? {});
  res.status(201).json({ data: await createBooking(req.user!, input) });
};
