import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

export const MAX_COMMENT_LENGTH = 500;

// one review per completed booking, from the customer about the technician
const reviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    technicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: MAX_COMMENT_LENGTH, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: toJSONOptions() },
);

reviewSchema.index({ technicianId: 1, createdAt: -1 });

export type Review = InferSchemaType<typeof reviewSchema>;
export type ReviewDocument = HydratedDocument<Review>;
export const ReviewModel = model('Review', reviewSchema);
