import { z } from 'zod';

const name = (what: string, max = 60) =>
  z
    .string({ error: `Write the ${what}` })
    .trim()
    .min(2, `Write the ${what}`)
    .max(max, `Keep the ${what} under ${max} characters`);

const price = (what: string) =>
  z
    .number({ error: `Write the ${what} as a number` })
    .int(`Write the ${what} in whole taka`)
    .min(0, "Prices can't be below 0")
    .max(500_000, 'That price looks too high');

export const skillSchema = z.object({ name: name('skill name') });

export const serviceUpdateSchema = z
  .object({
    name: name('service name').optional(),
    nameBn: name('Bangla name').optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nothing to change');

const priceItemFields = {
  skillId: z.string().min(1).nullable(),
  name: name('work', 80),
  minPrice: price('lowest price'),
  maxPrice: price('highest price'),
  unit: name('unit', 30),
  // empty means "no quick pick", so an admin can also clear it
  quickPick: z
    .string()
    .trim()
    .max(40, 'Keep the quick pick under 40 characters')
    .transform((value) => value || null)
    .optional(),
};

export const priceItemCreateSchema = z
  .object({ serviceId: z.string({ error: 'Choose a service' }).min(1), ...priceItemFields })
  .refine((data) => data.maxPrice >= data.minPrice, {
    message: "The highest price can't be below the lowest",
    path: ['maxPrice'],
  });

export const priceItemUpdateSchema = z
  .object({ ...priceItemFields, active: z.boolean() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to change');

export const safetyTipUpdateSchema = z
  .object({
    name: name('name').optional(),
    tips: z
      .array(
        z
          .string()
          .trim()
          .min(5, 'Each step needs a few words')
          .max(200, 'Keep each step under 200 characters'),
      )
      .min(1, 'Keep at least one safety step')
      .max(8, 'Keep it to 8 steps or fewer')
      .optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nothing to change');

export type PriceItemCreateInput = z.infer<typeof priceItemCreateSchema>;
export type PriceItemUpdateInput = z.infer<typeof priceItemUpdateSchema>;
export type SafetyTipUpdateInput = z.infer<typeof safetyTipUpdateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
