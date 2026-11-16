import { z } from 'zod';
import { dhakaLocation } from './location';

const ADDRESS_MESSAGE = 'Write your house, road and flat';

export const createBookingSchema = z.object({
  problemId: z.string({ error: 'Choose a problem first' }).min(1, 'Choose a problem first'),
  technicianId: z
    .string({ error: 'Choose a technician first' })
    .min(1, 'Choose a technician first'),
  location: dhakaLocation('Pin your home on the map'),
  // left out when booking "right now" for an emergency
  when: z.iso
    .datetime({ offset: true, error: 'Choose a date and time' })
    .transform((value) => new Date(value))
    .optional(),
  addressText: z
    .string({ error: ADDRESS_MESSAGE })
    .trim()
    .min(5, ADDRESS_MESSAGE)
    .max(200, 'Keep the address under 200 characters'),
  note: z.string().trim().max(300, 'Keep the note under 300 characters').default(''),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const changeStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled', 'on_the_way', 'arrived', 'completed'], {
    error: 'Choose what happened',
  }),
  // needed when the job is completed: what the customer paid in cash
  finalPrice: z
    .number({ error: 'Write the price as a number' })
    .int('Write the price in whole taka')
    .min(0, "The price can't be below 0")
    .max(500_000, 'That price looks too high')
    .optional(),
  // needed when the customer cancels after the technician accepted
  reason: z
    .string()
    .trim()
    .min(5, 'Write a few words about why')
    .max(300, 'Keep the reason under 300 characters')
    .optional(),
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
