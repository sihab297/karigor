import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// roughly the edges of Dhaka city
export const DHAKA_BOUNDS = { minLat: 23.6, maxLat: 23.95, minLng: 90.3, maxLng: 90.55 };

const time = z
  .string({ error: 'Time is required' })
  .regex(TIME_REGEX, 'Use 24-hour time like 09:00');

export const profileSchema = z.object({
  serviceIds: z
    .array(z.string(), { error: 'Choose at least one service' })
    .min(1, 'Choose at least one service')
    .max(3, 'Choose up to 3 services'),
  skillIds: z
    .array(z.string(), { error: 'Choose at least one skill' })
    .min(1, 'Choose at least one skill'),
  areaName: z
    .string({ error: 'Area is required' })
    .trim()
    .min(2, 'Area is required')
    .max(60, 'Area name is too long'),
  location: z
    .object(
      {
        lat: z.number({ error: 'Pick your location on the map' }),
        lng: z.number({ error: 'Pick your location on the map' }),
      },
      { error: 'Pick your location on the map' },
    )
    .refine(
      ({ lat, lng }) =>
        lat >= DHAKA_BOUNDS.minLat &&
        lat <= DHAKA_BOUNDS.maxLat &&
        lng >= DHAKA_BOUNDS.minLng &&
        lng <= DHAKA_BOUNDS.maxLng,
      'Pick a location inside Dhaka',
    ),
  serviceRadiusKm: z.literal([5, 10, 15], { error: 'Choose 5, 10 or 15 km' }).default(10),
  workingDays: z
    .array(z.number().int().min(0).max(6), { error: 'Choose your working days' })
    .min(1, 'Choose at least one working day')
    .refine((days) => new Set(days).size === days.length, 'Working days must not repeat'),
  workingHours: z
    .object({ start: time, end: time }, { error: 'Working hours are required' })
    .refine(({ start, end }) => start < end, {
      message: 'Start time must be before end time',
      path: ['end'],
    }),
  experienceYears: z
    .number({ error: 'Experience is required' })
    .int('Use whole years')
    .min(0, 'Experience cannot be negative')
    .max(60, 'Experience is too high'),
});

export const availabilitySchema = z.object({
  acceptingJobs: z.boolean({ error: 'Choose on or off' }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
