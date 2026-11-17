import type { RequestHandler } from 'express';
import {
  changeBookingStatus,
  createBooking,
  getBooking,
  listBookings,
} from '../services/booking.service';
import { listMessages } from '../services/message.service';
import {
  changeStatusSchema,
  createBookingSchema,
  listBookingsSchema,
} from '../validators/booking.validators';

export const create: RequestHandler = async (req, res) => {
  const input = createBookingSchema.parse(req.body ?? {});
  res.status(201).json({ data: await createBooking(req.user!, input) });
};

export const list: RequestHandler = async (req, res) => {
  const { status } = listBookingsSchema.parse(req.query);
  res.json({ data: await listBookings(req.user!, status) });
};

export const getOne: RequestHandler = async (req, res) => {
  res.json({ data: await getBooking(String(req.params.id), req.user!) });
};

export const changeStatus: RequestHandler = async (req, res) => {
  const input = changeStatusSchema.parse(req.body ?? {});
  res.json({ data: await changeBookingStatus(String(req.params.id), req.user!, input) });
};

export const messages: RequestHandler = async (req, res) => {
  res.json({ data: await listMessages(String(req.params.id), req.user!) });
};
