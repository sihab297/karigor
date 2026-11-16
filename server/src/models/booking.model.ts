import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

export const BOOKING_STATUSES = [
  'requested',
  'accepted',
  'rejected',
  'cancelled',
  'on_the_way',
  'arrived',
  'completed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// still going on: the customer can't book the same problem again
export const OPEN_STATUSES: BookingStatus[] = ['requested', 'accepted', 'on_the_way', 'arrived'];
// the technician has said yes, so that time is taken
export const BUSY_STATUSES: BookingStatus[] = ['accepted', 'on_the_way', 'arrived'];

// MongoDB wants [longitude, latitude]
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false, id: false },
);

const statusChangeSchema = new Schema(
  {
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    at: { type: Date, required: true },
    byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false, id: false },
);

const estimateSchema = new Schema(
  { min: { type: Number, required: true }, max: { type: Number, required: true } },
  { _id: false, id: false },
);

const bookingSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    technicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    problemReportId: { type: Schema.Types.ObjectId, ref: 'ProblemReport', required: true },
    serviceId: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    // booked for "right now" because of a danger at home
    emergency: { type: Boolean, default: false },
    location: { type: pointSchema, required: true },
    // house, road and flat: the technician sees it only after accepting
    addressText: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'requested', required: true },
    statusHistory: { type: [statusChangeSchema], default: [] },
    // copied from the AI result; null when the customer chose another service
    estimate: { type: estimateSchema, default: null },
    finalPrice: { type: Number, min: 0 },
    cancelReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

bookingSchema.index({ technicianId: 1, status: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ technicianId: 1, scheduledAt: 1 });
bookingSchema.index({ problemReportId: 1 });

export type Booking = InferSchemaType<typeof bookingSchema>;
export type BookingDocument = HydratedDocument<Booking>;
export const BookingModel = model('Booking', bookingSchema);
