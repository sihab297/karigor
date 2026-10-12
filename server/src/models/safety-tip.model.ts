import { model, Schema, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

const safetyTipSchema = new Schema(
  {
    // the emergency type, e.g. gas-leak
    _id: { type: String, required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    tips: { type: [String] },
    active: { type: Boolean, default: true },
  },
  { collection: 'safetyTips', timestamps: true, toJSON: toJSONOptions() },
);

safetyTipSchema.path('tips').validate((tips: string[]) => tips.length > 0, 'Add at least one tip');

export type SafetyTip = InferSchemaType<typeof safetyTipSchema>;
export const SafetyTipModel = model('SafetyTip', safetyTipSchema);
