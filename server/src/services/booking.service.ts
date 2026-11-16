import { BookingModel, BUSY_STATUSES, OPEN_STATUSES } from '../models/booking.model';
import type { UserDocument } from '../models/user.model';
import { AppError } from '../utils/app-error';
import type { CreateBookingInput } from '../validators/booking.validators';
import { findMatches } from './matching.service';
import { findReport } from './problem.service';

// a job keeps the technician busy for about this long on each side of its start time
const SLOT_MS = 2 * 60 * 60 * 1000;

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
  const busy = await BookingModel.exists({
    technicianId: match.technicianId,
    status: { $in: BUSY_STATUSES },
    scheduledAt: {
      $gt: new Date(scheduledAt.getTime() - SLOT_MS),
      $lt: new Date(scheduledAt.getTime() + SLOT_MS),
    },
  });
  if (busy) {
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

  return {
    booking: booking.toJSON(),
    technician: { id: match.technicianId, name: match.name },
  };
}
