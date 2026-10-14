import { z } from 'zod';
import { dhakaLocation } from './location';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  location: dhakaLocation('Pick your location on the map'),
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
