import type { BookingStatus } from '../models/booking.model';

export type BookingSide = 'customer' | 'technician';

// who may move a booking from one status to the next (docs/03-booking-flow.md)
export const STATUS_RULES: Partial<
  Record<BookingStatus, Partial<Record<BookingStatus, BookingSide>>>
> = {
  requested: { accepted: 'technician', rejected: 'technician', cancelled: 'customer' },
  accepted: { on_the_way: 'technician', cancelled: 'customer' },
  on_the_way: { arrived: 'technician' },
  arrived: { completed: 'technician' },
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  requested: 'waiting for a reply',
  accepted: 'accepted',
  rejected: 'rejected',
  cancelled: 'cancelled',
  on_the_way: 'on the way',
  arrived: 'arrived',
  completed: 'completed',
};

export function whoCanChange(from: BookingStatus, to: BookingStatus): BookingSide | null {
  return STATUS_RULES[from]?.[to] ?? null;
}
