import { model, Schema, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Use 24-hour time like 09:00';

// MongoDB wants [longitude, latitude], not the other way round
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      default: undefined,
      required: [true, 'Location is required'],
      validate: {
        validator: (c: number[]) =>
          c.length === 2 && c[0]! >= -180 && c[0]! <= 180 && c[1]! >= -90 && c[1]! <= 90,
        message: 'Location must be [longitude, latitude]',
      },
    },
  },
  { _id: false, id: false },
);

const workingHoursSchema = new Schema(
  {
    start: { type: String, required: true, match: [TIME_REGEX, TIME_MESSAGE] },
    end: { type: String, required: true, match: [TIME_REGEX, TIME_MESSAGE] },
  },
  { _id: false, id: false },
);

const technicianProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceIds: { type: [String] },
    skillIds: { type: [String] },
    areaName: { type: String, required: [true, 'Area is required'], trim: true },
    location: { type: pointSchema, required: [true, 'Location is required'] },
    serviceRadiusKm: { type: Number, default: 10, min: 1, max: 30 },
    // 0 = Sunday, 6 = Saturday
    workingDays: { type: [Number] },
    workingHours: { type: workingHoursSchema, required: [true, 'Working hours are required'] },
    experienceYears: {
      type: Number,
      required: [true, 'Experience is required'],
      min: [0, 'Experience cannot be negative'],
      max: [60, 'Experience is too high'],
    },
    acceptingJobs: { type: Boolean, default: true },
    nidPhotoPublicId: { type: String },
    profilePhotoUrl: { type: String },
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: 'pending' },
    rejectionReason: { type: String, trim: true, maxlength: 300 },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    // e.g. { electrician: 18 }
    jobsDone: { type: Map, of: Number, default: () => new Map() },
  },
  {
    collection: 'technicianProfiles',
    timestamps: true,
    toJSON: toJSONOptions(['nidPhotoPublicId']),
  },
);

technicianProfileSchema
  .path('serviceIds')
  .validate((ids: string[]) => ids.length > 0, 'Choose at least one service');
technicianProfileSchema
  .path('skillIds')
  .validate((ids: string[]) => ids.length > 0, 'Choose at least one skill');
technicianProfileSchema
  .path('workingDays')
  .validate((days: number[]) => days.length > 0, 'Choose at least one working day')
  .validate(
    (days: number[]) => days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    'Working days must be numbers from 0 (Sunday) to 6 (Saturday)',
  )
  .validate((days: number[]) => new Set(days).size === days.length, 'Working days must not repeat');
technicianProfileSchema.path('workingHours').validate(
  // skip if the format is wrong, so that error shows first
  (hours: { start: string; end: string }) =>
    !TIME_REGEX.test(hours.start) || !TIME_REGEX.test(hours.end) || hours.start < hours.end,
  'Start time must be before end time',
);

technicianProfileSchema.virtual('hasNidPhoto').get(function (this: {
  nidPhotoPublicId?: string | null;
}) {
  return Boolean(this.nidPhotoPublicId);
});

technicianProfileSchema.index({ userId: 1 }, { unique: true });
technicianProfileSchema.index({ location: '2dsphere' });
technicianProfileSchema.index({ approvalStatus: 1, serviceIds: 1 });

export type TechnicianProfile = InferSchemaType<typeof technicianProfileSchema>;
export const TechnicianProfileModel = model('TechnicianProfile', technicianProfileSchema);
