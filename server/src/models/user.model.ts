import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { BD_PHONE_REGEX, normalizeBdPhone } from '../utils/phone';
import { toJSONOptions } from '../utils/to-json';

export const USER_ROLES = ['customer', 'technician', 'admin'] as const;
export const USER_STATUSES = ['active', 'blocked'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name is too short'],
      maxlength: [80, 'Name is too long'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      set: (value: unknown) => (typeof value === 'string' ? normalizeBdPhone(value) : value),
      match: [BD_PHONE_REGEX, 'Phone must be a Bangladeshi mobile number like 01712345678'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Email is not valid'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: [true, 'Role is required'] },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
  },
  { collection: 'users', timestamps: true, toJSON: toJSONOptions(['passwordHash']) },
);

userSchema.index({ phone: 1 }, { unique: true });
// email is optional, so only check users who have one
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel = model('User', userSchema);
