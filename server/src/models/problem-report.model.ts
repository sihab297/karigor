import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/to-json';

const priceLineSchema = new Schema(
  {
    priceItemId: String,
    name: String,
    unit: String,
    quantity: Number,
    minPrice: Number,
    maxPrice: Number,
  },
  { _id: false, id: false },
);

const estimateSchema = new Schema({ min: Number, max: Number }, { _id: false, id: false });

// a copy of what the AI said, so it stays the same even if the catalog changes later
const analysisSchema = new Schema(
  {
    understood: Boolean,
    serviceId: { type: String, default: null },
    serviceName: { type: String, default: null },
    skillIds: [String],
    summary: String,
    urgency: { type: String, enum: ['normal', 'urgent', 'emergency'] },
    confidence: { type: String, enum: ['high', 'medium', 'low'] },
    emergencyType: { type: String, default: null },
    safetyTips: [String],
    emergencyNumber: { type: String, default: null },
    priceLines: [priceLineSchema],
    estimate: { type: estimateSchema, default: null },
    matchesChosenService: Boolean,
    followUpQuestion: { type: String, default: null },
    model: String,
    latencyMs: Number,
  },
  { _id: false, id: false },
);

const problemReportSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, enum: ['describe', 'quick'], required: true },
    chosenServiceId: { type: String },
    text: { type: String, trim: true, maxlength: 500, default: '' },
    photoIds: { type: [String], default: [] },
    ai: { type: analysisSchema, default: null },
    aiError: { type: String },
    finalServiceId: { type: String },
  },
  { collection: 'problemReports', timestamps: true, toJSON: toJSONOptions(['photoIds']) },
);

problemReportSchema.index({ customerId: 1, createdAt: -1 });

export type ProblemReport = InferSchemaType<typeof problemReportSchema>;
export type ProblemReportDocument = HydratedDocument<ProblemReport>;
export const ProblemReportModel = model('ProblemReport', problemReportSchema);
