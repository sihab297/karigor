import { z } from 'zod';
import type { Catalog } from './catalog';

export const UNKNOWN_SERVICE = 'unknown';
export const NO_EMERGENCY = 'none';

export const urgencySchema = z.enum(['normal', 'urgent', 'emergency']);
export const confidenceSchema = z.enum(['high', 'medium', 'low']);

export type Urgency = z.infer<typeof urgencySchema>;
export type Confidence = z.infer<typeof confidenceSchema>;

// sent to Gemini so it answers in this shape, then used to check the answer
export function buildAiOutputSchema(catalog: Catalog) {
  const serviceIds = catalog.services.map((s) => s.id);
  const emergencyIds = catalog.emergencyTypes.map((e) => e.id);

  return z.object({
    serviceId: z
      .enum([...serviceIds, UNKNOWN_SERVICE])
      .describe('The one service that fits the problem, or "unknown".'),
    skillIds: z.array(z.string()).describe('Skills needed, only from the chosen service.'),
    summary: z
      .string()
      .describe('One or two short sentences in simple English for the technician.'),
    urgency: urgencySchema,
    confidence: confidenceSchema,
    emergencyType: z.enum([...emergencyIds, NO_EMERGENCY]),
    priceItems: z
      .array(
        z.object({
          priceItemId: z.string(),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .describe('Matching price items, only from the chosen service.'),
    matchesChosenService: z.boolean(),
    followUpQuestion: z.string().describe('One short question if more detail is needed, else "".'),
  });
}

export type AiOutput = z.infer<ReturnType<typeof buildAiOutputSchema>>;

export function buildResponseJsonSchema(catalog: Catalog): Record<string, unknown> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(buildAiOutputSchema(catalog));
  delete jsonSchema.$schema;
  return jsonSchema;
}
