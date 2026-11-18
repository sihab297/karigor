import { describe, expect, it } from 'vitest';
import { BOOKING_STATUSES, type BookingStatus } from '../src/models/booking.model';
import { whoCanChange } from '../src/services/booking-rules';

// every step allowed in docs/03-booking-flow.md, and who takes it; anything else is refused
const ALLOWED: Record<string, 'customer' | 'technician'> = {
  'requested>accepted': 'technician',
  'requested>rejected': 'technician',
  'requested>cancelled': 'customer',
  'accepted>on_the_way': 'technician',
  'accepted>cancelled': 'customer',
  'on_the_way>arrived': 'technician',
  'arrived>completed': 'technician',
};

const pairs = BOOKING_STATUSES.flatMap((from) =>
  BOOKING_STATUSES.map((to) => [from, to] as [BookingStatus, BookingStatus]),
);

describe('booking status rules', () => {
  it.each(pairs)('%s -> %s', (from, to) => {
    expect(whoCanChange(from, to)).toBe(ALLOWED[`${from}>${to}`] ?? null);
  });

  it('has no way out of a finished booking', () => {
    for (const done of ['completed', 'cancelled', 'rejected'] as BookingStatus[]) {
      for (const to of BOOKING_STATUSES) expect(whoCanChange(done, to)).toBeNull();
    }
  });

  it('never lets the customer cancel once the technician is on the way', () => {
    expect(whoCanChange('on_the_way', 'cancelled')).toBeNull();
    expect(whoCanChange('arrived', 'cancelled')).toBeNull();
  });
});
