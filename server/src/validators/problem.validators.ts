import { z } from 'zod';
import { dhakaLocation } from './location';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// photos come separately as files; these are the text fields
export const analyzeSchema = z.object({
  text: z
    .string()
    .trim()
    .max(500, 'Keep it under 500 characters')
    .refine((text) => text === '' || text.length >= 3, 'Write a little more')
    .default(''),
  chosenServiceId: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const finalServiceSchema = z.object({
  finalServiceId: z.string({ error: 'Choose a service' }).min(1, 'Choose a service'),
});

export type AnalyzeFields = z.infer<typeof analyzeSchema>;

// "when" is ignored for emergencies: we look for people free right now
export const matchSchema = z.object({
  location: dhakaLocation('Pin your home on the map'),
  when: z.iso
    .datetime({ offset: true, error: 'Choose a date and time' })
    .transform((value) => new Date(value))
    .optional(),
});

export type MatchInput = z.infer<typeof matchSchema>;
