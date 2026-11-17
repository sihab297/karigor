import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../models/message.model';

export const sendMessageSchema = z.object({
  bookingId: z.string({ error: 'Choose a booking' }).min(1, 'Choose a booking'),
  text: z
    .string({ error: 'Write a message' })
    .trim()
    .min(1, 'Write a message')
    .max(MAX_MESSAGE_LENGTH, `Keep the message under ${MAX_MESSAGE_LENGTH} characters`),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
