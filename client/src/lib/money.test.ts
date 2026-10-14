import { describe, expect, it } from 'vitest';
import { taka, takaRange } from './money';

describe('money', () => {
  it('writes taka the Bangladeshi way', () => {
    expect(taka(400)).toBe('৳400');
    expect(taka(1200)).toBe('৳1,200');
    expect(taka(120000)).toBe('৳1,20,000');
  });

  it('shows a range, or one price when both ends match', () => {
    expect(takaRange(500, 1200)).toBe('৳500 – ৳1,200');
    expect(takaRange(300, 300)).toBe('৳300');
  });
});
