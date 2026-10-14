import { describe, expect, it } from 'vitest';
import { dhakaClock } from '../../src/utils/dhaka-time';

describe('dhakaClock', () => {
  it('turns a moment into the day and time in Dhaka', () => {
    // 04:00 UTC is 10:00 in Dhaka, on Saturday 17 October 2026
    expect(dhakaClock(new Date('2026-10-17T04:00:00Z'))).toEqual({ day: 6, time: '10:00' });
  });

  it('moves to the next day after midnight in Dhaka', () => {
    // still Friday in London, already Saturday in Dhaka
    expect(dhakaClock(new Date('2026-10-16T19:30:00Z'))).toEqual({ day: 6, time: '01:30' });
  });

  it('reads times written with a Dhaka offset', () => {
    expect(dhakaClock(new Date('2026-10-18T19:45:00+06:00'))).toEqual({ day: 0, time: '19:45' });
  });
});
