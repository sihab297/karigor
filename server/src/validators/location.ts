import { z } from 'zod';

// roughly the edges of Dhaka city
export const DHAKA_BOUNDS = { minLat: 23.6, maxLat: 23.95, minLng: 90.3, maxLng: 90.55 };

export function dhakaLocation(missing: string) {
  return z
    .object(
      { lat: z.number({ error: missing }), lng: z.number({ error: missing }) },
      { error: missing },
    )
    .refine(
      ({ lat, lng }) =>
        lat >= DHAKA_BOUNDS.minLat &&
        lat <= DHAKA_BOUNDS.maxLat &&
        lng >= DHAKA_BOUNDS.minLng &&
        lng <= DHAKA_BOUNDS.maxLng,
      'Pick a location inside Dhaka',
    );
}
