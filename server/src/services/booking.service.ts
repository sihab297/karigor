import { isValidObjectId, type Types } from 'mongoose';
import {
  BookingModel,
  BUSY_STATUSES,
  OPEN_STATUSES,
  type BookingStatus,
} from '../models/booking.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import type { UserDocument } from '../models/user.model';
import { AppError, fieldError } from '../utils/app-error';
import type { ChangeStatusInput, CreateBookingInput } from '../validators/booking.validators';
import { STATUS_LABELS, whoCanChange, type BookingSide } from './booking-rules';
import { buildBookingViews, type Viewer } from './booking-view';
import { emitBookingStatus, emitNewBooking } from '../realtime/socket';
import { findMatches } from './matching.service';
import { findReport } from './problem.service';

// a job keeps the technician busy for about this long on each side of its start time
const SLOT_MS = 2 * 60 * 60 * 1000;

// another job the technician said yes to, close to this time
function findClashingJob(
  technicianId: Types.ObjectId | string,
  at: Date,
  exceptId?: Types.ObjectId,
) {
  return BookingModel.exists({
    technicianId,
    status: { $in: BUSY_STATUSES },
    scheduledAt: {
      $gt: new Date(at.getTime() - SLOT_MS),
      $lt: new Date(at.getTime() + SLOT_MS),
    },
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
}

export async function createBooking(
  customer: UserDocument,
  input: CreateBookingInput,
  now = new Date(),
) {
  const report = await findReport(input.problemId, customer, { ownerOnly: true });

  const open = await BookingModel.exists({
    problemReportId: report._id,
    status: { $in: OPEN_STATUSES },
  });
  if (open) {
    throw new AppError(
      409,
      'ALREADY_BOOKED',
      'You already sent a booking request for this problem. See My bookings.',
    );
  }

  // search again, so the technician must still be one of the best 3 and free at that time
  const search = await findMatches(
    input.problemId,
    customer,
    { location: input.location, when: input.when },
    now,
  );
  const match = search.matches.find((m) => m.technicianId === input.technicianId);
  if (!match) {
    throw new AppError(
      409,
      'TECHNICIAN_NOT_AVAILABLE',
      'This karigor is no longer free for that time and place. Choose another one.',
    );
  }

  const scheduledAt = new Date(search.when);
  if (await findClashingJob(match.technicianId, scheduledAt)) {
    throw new AppError(
      409,
      'TECHNICIAN_BUSY',
      `${match.name} already has a job at that time. Choose another karigor or time.`,
    );
  }

  // the AI's price only fits the AI's own service
  const ai = report.ai;
  const estimate = ai?.understood && ai.serviceId === search.serviceId ? ai.estimate : null;

  const booking = await new BookingModel({
    customerId: customer._id,
    technicianId: match.technicianId,
    problemReportId: report._id,
    serviceId: search.serviceId,
    scheduledAt,
    emergency: search.emergency,
    location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
    addressText: input.addressText,
    note: input.note,
    status: 'requested',
    statusHistory: [{ status: 'requested', at: now, byUserId: customer._id }],
    estimate: estimate ? { min: estimate.min, max: estimate.max } : null,
  }).save();

  emitNewBooking(match.technicianId, {
    bookingId: booking.id as string,
    serviceName: search.serviceName,
    emergency: search.emergency,
  });

  return {
    booking: booking.toJSON(),
    technician: { id: match.technicianId, name: match.name },
  };
}

// only the two people in a booking can change it; the admin can also look
async function findOwnBooking(id: string, user: UserDocument) {
  const booking = isValidObjectId(id) ? await BookingModel.findById(id) : null;
  let side: BookingSide | null = null;
  if (booking?.customerId.equals(user._id)) side = 'customer';
  else if (booking?.technicianId.equals(user._id)) side = 'technician';
  if (!booking || !side) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', "We couldn't find this booking.");
  }
  return { booking, side };
}

export async function changeBookingStatus(
  id: string,
  user: UserDocument,
  input: ChangeStatusInput,
  now = new Date(),
) {
  const { booking, side } = await findOwnBooking(id, user);
  const from = booking.status as BookingStatus;
  const to = input.status;

  const allowedSide = whoCanChange(from, to);
  if (!allowedSide) {
    throw new AppError(
      409,
      'STATUS_CHANGE_NOT_ALLOWED',
      `This booking is ${STATUS_LABELS[from]}, so it can't be marked as ${STATUS_LABELS[to]}.`,
    );
  }
  if (allowedSide !== side) {
    throw new AppError(
      403,
      'NOT_ALLOWED',
      `Only the ${allowedSide} can mark this booking as ${STATUS_LABELS[to]}.`,
    );
  }

  const changes: Record<string, unknown> = { status: to };
  if (to === 'completed') {
    if (input.finalPrice === undefined) {
      throw fieldError('finalPrice', 'Write the final price the customer paid');
    }
    changes.finalPrice = input.finalPrice;
  }
  if (to === 'cancelled') {
    // once the technician has said yes, they deserve to know why
    if (from === 'accepted' && !input.reason) {
      throw fieldError('reason', 'Tell the karigor why you are cancelling');
    }
    if (input.reason) changes.cancelReason = input.reason;
  }
  if (
    to === 'accepted' &&
    (await findClashingJob(booking.technicianId, booking.scheduledAt, booking._id))
  ) {
    throw new AppError(
      409,
      'TECHNICIAN_BUSY',
      'You already have a job at that time. Say no to this one, or finish the other first.',
    );
  }

  // only update if nobody changed it in the meantime (for example, two taps at once)
  const updated = await BookingModel.findOneAndUpdate(
    { _id: booking._id, status: from },
    {
      $set: changes,
      $push: { statusHistory: { status: to, at: now, byUserId: user._id } },
    },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw new AppError(
      409,
      'STATUS_CHANGED',
      'This booking was just changed by someone else. Refresh to see the latest.',
    );
  }

  if (to === 'completed') {
    await TechnicianProfileModel.updateOne(
      { userId: updated.technicianId },
      { $inc: { [`jobsDone.${updated.serviceId}`]: 1 } },
    );
  }

  emitBookingStatus(updated.id as string, to);
  const [view] = await buildBookingViews([updated], () => side);
  return { booking: view };
}

// customers see their bookings, technicians their jobs; newest first
export async function listBookings(user: UserDocument, statuses?: BookingStatus[]) {
  const side: BookingSide = user.role === 'technician' ? 'technician' : 'customer';
  const bookings = await BookingModel.find({
    [side === 'technician' ? 'technicianId' : 'customerId']: user._id,
    ...(statuses?.length ? { status: { $in: statuses } } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(100);
  return { bookings: await buildBookingViews(bookings, () => side) };
}

export async function getBooking(id: string, user: UserDocument) {
  let viewer: Viewer;
  let booking;
  if (user.role === 'admin') {
    booking = isValidObjectId(id) ? await BookingModel.findById(id) : null;
    if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', "We couldn't find this booking.");
    viewer = 'admin';
  } else {
    ({ booking, side: viewer } = await findOwnBooking(id, user));
  }
  const [view] = await buildBookingViews([booking], () => viewer);
  return { booking: view };
}
