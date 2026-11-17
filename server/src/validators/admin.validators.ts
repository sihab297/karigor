import { z } from 'zod';
import { BOOKING_STATUSES } from '../models/booking.model';
import { APPROVAL_STATUSES } from '../models/technician-profile.model';
import { USER_ROLES, USER_STATUSES } from '../models/user.model';

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

const page = z.coerce.number().int().min(1).default(1);
const search = z.string().trim().max(60).optional();

// ?status=accepted,on_the_way&q=rahim&page=2
export const adminBookingsQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((s) => s.trim()) : []))
    .pipe(z.array(z.enum(BOOKING_STATUSES, { error: 'Unknown booking status' }))),
  q: search,
  page,
});

export const adminUsersQuery = z.object({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  q: search,
  page,
});

export const userStatusSchema = z.object({
  status: z.enum(USER_STATUSES, { error: 'Choose active or blocked' }),
});

export type AdminBookingsQuery = z.infer<typeof adminBookingsQuery>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuery>;
