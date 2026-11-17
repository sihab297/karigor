import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';

describe('distanceKm', () => {
  it('measures straight-line distance across Dhaka', () => {
    const mirpur10 = { lat: 23.8069, lng: 90.3687 };
    // about 1 km further north
    const north = { lat: 23.8069 + 1 / 111.32, lng: 90.3687 };

    expect(distanceKm(mirpur10, mirpur10)).toBe(0);
    expect(distanceKm(mirpur10, north)).toBeCloseTo(1, 1);
  });
});
