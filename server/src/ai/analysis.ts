import { findEmergencyType, findService, type Catalog } from './catalog';
import { NO_EMERGENCY, type AiOutput, type Confidence, type Urgency } from './schema';

export interface PriceLine {
  priceItemId: string;
  name: string;
  unit: string;
  quantity: number;
  /** Already multiplied by quantity */
  minPrice: number;
  maxPrice: number;
}

/** What the customer finally sees after the AI answer has been checked. */
export interface AnalysisResult {
  understood: boolean;
  serviceId: string | null;
  serviceName: string | null;
  skillIds: string[];
  summary: string;
  urgency: Urgency;
  confidence: Confidence;
  emergencyType: string | null;
  safetyTips: string[];
  emergencyNumber: string | null;
  priceLines: PriceLine[];
  estimate: { min: number; max: number } | null;
  matchesChosenService: boolean;
  followUpQuestion: string | null;
}

const MAX_QUANTITY = 20;
const DEFAULT_FOLLOW_UP = 'Can you tell us a bit more about the problem, or add a photo?';

/**
 * Turns the raw AI answer into a safe result.
 * The AI only picks ids; the prices, totals and safety tips always come from our own data,
 * so the AI can never invent a price or a safety step.
 */
export function buildAnalysis(
  raw: AiOutput,
  catalog: Catalog,
  chosenServiceId?: string,
): AnalysisResult {
  const service = findService(catalog, raw.serviceId);
  const followUp = raw.followUpQuestion.trim();

  if (!service) {
    return {
      understood: false,
      serviceId: null,
      serviceName: null,
      skillIds: [],
      summary: raw.summary,
      urgency: raw.urgency,
      confidence: 'low',
      emergencyType: null,
      safetyTips: [],
      emergencyNumber: raw.urgency === 'emergency' ? catalog.emergencyNumber : null,
      priceLines: [],
      estimate: null,
      matchesChosenService: !chosenServiceId,
      followUpQuestion: followUp || DEFAULT_FOLLOW_UP,
    };
  }

  const validSkills = new Set(service.skills.map((s) => s.id));
  const skillIds = [...new Set(raw.skillIds)].filter((id) => validSkills.has(id));

  // Merge repeated items and keep only items that belong to this service
  const quantities = new Map<string, number>();
  for (const item of raw.priceItems) {
    if (service.priceItems.some((p) => p.id === item.priceItemId)) {
      quantities.set(item.priceItemId, (quantities.get(item.priceItemId) ?? 0) + item.quantity);
    }
  }
  if (quantities.size === 0) {
    const visit = service.priceItems.find((p) => p.skillId === null);
    if (visit) quantities.set(visit.id, 1);
  }

  const priceLines: PriceLine[] = [...quantities].map(([priceItemId, quantity]) => {
    const item = service.priceItems.find((p) => p.id === priceItemId)!;
    const qty = Math.min(Math.max(quantity, 1), MAX_QUANTITY);
    return {
      priceItemId,
      name: item.name,
      unit: item.unit,
      quantity: qty,
      minPrice: item.minPrice * qty,
      maxPrice: item.maxPrice * qty,
    };
  });

  const estimate = priceLines.length
    ? {
        min: priceLines.reduce((sum, line) => sum + line.minPrice, 0),
        max: priceLines.reduce((sum, line) => sum + line.maxPrice, 0),
      }
    : null;

  const emergency =
    raw.emergencyType !== NO_EMERGENCY ? findEmergencyType(catalog, raw.emergencyType) : undefined;
  // A known emergency type always means the job is an emergency
  const urgency: Urgency = emergency ? 'emergency' : raw.urgency;

  return {
    understood: true,
    serviceId: service.id,
    serviceName: service.name,
    skillIds,
    summary: raw.summary,
    urgency,
    confidence: raw.confidence,
    emergencyType: emergency?.id ?? null,
    safetyTips: emergency?.tips ?? [],
    emergencyNumber: urgency === 'emergency' ? catalog.emergencyNumber : null,
    priceLines,
    estimate,
    matchesChosenService: !chosenServiceId || chosenServiceId === service.id,
    followUpQuestion: followUp || (raw.confidence === 'low' ? DEFAULT_FOLLOW_UP : null),
  };
}
