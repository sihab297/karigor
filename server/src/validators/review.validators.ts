import { z } from 'zod';
import { MAX_COMMENT_LENGTH } from '../models/review.model';

export const reviewSchema = z.object({
  rating: z
    .number({ error: 'Choose 1 to 5 stars' })
    .int('Choose 1 to 5 stars')
    .min(1, 'Choose 1 to 5 stars')
    .max(5, 'Choose 1 to 5 stars'),
  comment: z
    .string()
    .trim()
    .max(MAX_COMMENT_LENGTH, `Keep the review under ${MAX_COMMENT_LENGTH} characters`)
    .default(''),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
