import type { BookingDocument, BookingStatus } from '../models/booking.model';
import { MessageModel, type MessageDocument } from '../models/message.model';
import type { UserDocument } from '../models/user.model';
import { AppError } from '../utils/app-error';
import type { SendMessageInput } from '../validators/message.validators';
import { findOwnBooking } from './booking.service';

// the chat opens when the technician accepts and closes when the job is done
export const CHAT_OPEN_STATUSES: BookingStatus[] = ['accepted', 'on_the_way', 'arrived'];
const HISTORY_LIMIT = 300;

export function isChatOpen(status: string) {
  return CHAT_OPEN_STATUSES.includes(status as BookingStatus);
}

function messageView(message: MessageDocument, booking: BookingDocument) {
  return {
    id: message.id as string,
    bookingId: message.bookingId.toString(),
    text: message.text,
    at: message.get('createdAt') as Date,
    from: message.senderId.equals(booking.customerId)
      ? ('customer' as const)
      : ('technician' as const),
  };
}

export type MessageView = ReturnType<typeof messageView>;

export async function listMessages(bookingId: string, user: UserDocument) {
  const { booking } = await findOwnBooking(bookingId, user);
  // the latest messages, shown oldest first
  const latest = await MessageModel.find({ bookingId: booking._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT);
  return {
    messages: latest.reverse().map((message) => messageView(message, booking)),
    chatOpen: isChatOpen(booking.status),
  };
}

export async function sendMessage(user: UserDocument, input: SendMessageInput) {
  const { booking } = await findOwnBooking(input.bookingId, user);
  if (!isChatOpen(booking.status)) {
    throw new AppError(
      409,
      'CHAT_CLOSED',
      booking.status === 'requested'
        ? 'The chat opens when the karigor accepts.'
        : 'The chat is closed for this booking.',
    );
  }
  const message = await MessageModel.create({
    bookingId: booking._id,
    senderId: user._id,
    text: input.text,
  });
  return messageView(message, booking);
}
