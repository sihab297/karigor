import { describe, expect, it } from 'vitest';
import { describeDays } from './days';
import { timeAgo } from './relative-time';

describe('describeDays', () => {
  it('joins days that run on, starting from Saturday', () => {
    expect(describeDays([0, 1, 2, 3, 4, 6])).toBe('Sat to Thu');
    expect(describeDays([0, 1, 2])).toBe('Sun to Tue');
  });

  it('lists days that have gaps', () => {
    expect(describeDays([6, 1, 3])).toBe('Sat, Mon, Wed');
    expect(describeDays([0, 1])).toBe('Sun, Mon');
  });

  it('handles every day and no days', () => {
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(describeDays([])).toBe('No days chosen');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-12T12:00:00Z');

  it('says today, yesterday or how many days', () => {
    expect(timeAgo('2026-10-12T08:00:00Z', now)).toBe('today');
    expect(timeAgo('2026-10-11T08:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-10-09T12:00:00Z', now)).toBe('3 days ago');
  });

  it('shows the date for old things', () => {
    expect(timeAgo('2026-08-01T12:00:00Z', now)).toBe('on 1 Aug 2026');
  });
});
