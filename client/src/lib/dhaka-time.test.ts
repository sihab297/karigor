import { describe, expect, it } from 'vitest';
import {
  dayLabel,
  dhakaDate,
  hourLabel,
  isDayOver,
  isTooSoon,
  nextDays,
  slotIso,
  whenLabel,
} from './dhaka-time';

// Wednesday 14 October 2026, 08:00 in Dhaka
const now = new Date('2026-10-14T02:00:00Z');

describe('dhaka time', () => {
  it('uses the Dhaka date, not the phone time zone', () => {
    // 20:00 UTC on the 14th is already 02:00 on the 15th in Dhaka
    expect(dhakaDate(new Date('2026-10-14T20:00:00Z'))).toBe('2026-10-15');
  });

  it('lists the next 7 days from today', () => {
    expect(nextDays(now)).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ]);
  });

  it('labels days the way people say them', () => {
    expect(dayLabel('2026-10-14', now)).toEqual({ top: 'Today', bottom: '14 Oct' });
    expect(dayLabel('2026-10-15', now)).toEqual({ top: 'Tomorrow', bottom: '15 Oct' });
    expect(dayLabel('2026-10-16', now)).toEqual({ top: 'Fri', bottom: '16 Oct' });
  });

  it('writes a slot with the Dhaka offset', () => {
    expect(slotIso({ date: '2026-10-15', hour: 9 })).toBe('2026-10-15T09:00:00+06:00');
    expect(hourLabel(9)).toBe('9:00 AM');
    expect(hourLabel(12)).toBe('12:00 PM');
    expect(hourLabel(19)).toBe('7:00 PM');
  });

  it('blocks times that are too soon', () => {
    expect(isTooSoon({ date: '2026-10-14', hour: 8 }, now)).toBe(true);
    expect(isTooSoon({ date: '2026-10-14', hour: 9 }, now)).toBe(false);
    expect(isDayOver('2026-10-14', now)).toBe(false);
    expect(isDayOver('2026-10-14', new Date('2026-10-14T13:00:00Z'))).toBe(true);
  });

  it('describes a chosen time', () => {
    expect(whenLabel('2026-10-15T04:00:00.000Z', now)).toBe('Tomorrow, 15 Oct at 10:00 AM');
    expect(whenLabel('2026-10-17T11:00:00.000Z', now)).toBe('Saturday, 17 Oct at 5:00 PM');
  });
});
