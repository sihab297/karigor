import { model, Schema, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

const skillSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false, id: false },
);

const serviceSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    nameBn: { type: String, required: [true, 'Bangla name is required'], trim: true },
    skills: { type: [skillSchema] },
    active: { type: Boolean, default: true },
  },
  { collection: 'services', timestamps: true, toJSON: toJSONOptions() },
);

serviceSchema
  .path('skills')
  .validate((skills: unknown[]) => skills.length > 0, 'Add at least one skill');

export type Service = InferSchemaType<typeof serviceSchema>;
export const ServiceModel = model('Service', serviceSchema);
