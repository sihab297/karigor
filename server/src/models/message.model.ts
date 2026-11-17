import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

export const MAX_MESSAGE_LENGTH = 1000;

// one chat message between the customer and the technician of a booking
const messageSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: MAX_MESSAGE_LENGTH },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: toJSONOptions() },
);

messageSchema.index({ bookingId: 1, createdAt: 1 });

export type Message = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<Message>;
export const MessageModel = model('Message', messageSchema);
