import { model, Schema, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

const priceItemSchema = new Schema(
  {
    _id: { type: String, required: true },
    serviceId: { type: String, ref: 'Service', required: true },
    // null for "Visit and check"
    skillId: { type: String, default: null },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    minPrice: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    maxPrice: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    unit: { type: String, required: [true, 'Unit is required'], trim: true },
    active: { type: Boolean, default: true },
  },
  { collection: 'priceItems', timestamps: true, toJSON: toJSONOptions() },
);

priceItemSchema.path('maxPrice').validate(function (maxPrice: number) {
  const { minPrice } = this as { minPrice: number };
  return maxPrice >= minPrice;
}, 'Max price cannot be less than min price');

priceItemSchema.index({ serviceId: 1 });

export type PriceItem = InferSchemaType<typeof priceItemSchema>;
export const PriceItemModel = model('PriceItem', priceItemSchema);
