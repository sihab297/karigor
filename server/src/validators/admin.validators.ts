import { z } from 'zod';
import { APPROVAL_STATUSES } from '../models/technician-profile.model';

export const technicianListQuery = z.object({
  status: z
    .enum(APPROVAL_STATUSES, { error: 'Status must be pending, approved or rejected' })
    .default('pending'),
});

export const approvalSchema = z.discriminatedUnion(
  'status',
  [
    z.object({ status: z.literal('approved') }),
    z.object({
      status: z.literal('rejected'),
      reason: z
        .string({ error: 'Tell the technician why' })
        .trim()
        .min(5, 'Tell the technician why, in a few words')
        .max(300, 'Keep the reason under 300 characters'),
    }),
  ],
  { error: 'Choose approve or reject' },
);

export type ApprovalInput = z.infer<typeof approvalSchema>;
