import { describe, expect, it } from 'vitest';
import { buildAnalysis } from '../src/ai/analysis';
import { defaultCatalog } from '../src/ai/catalog';
import { buildUserPrompt, redactPersonalInfo } from '../src/ai/prompt';
import { buildAiOutputSchema, buildResponseJsonSchema, type AiOutput } from '../src/ai/schema';

function aiAnswer(overrides: Partial<AiOutput> = {}): AiOutput {
  return {
    serviceId: 'plumber',
    skillIds: ['tap-repair'],
    summary: 'Kitchen tap is leaking.',
    urgency: 'normal',
    confidence: 'high',
    emergencyType: 'none',
    priceItems: [{ priceItemId: 'plumber-tap', quantity: 1 }],
    matchesChosenService: true,
    followUpQuestion: '',
    ...overrides,
  };
}

describe('buildAnalysis', () => {
  it('works out the price from our own price list and the quantity', () => {
    const result = buildAnalysis(
      aiAnswer({
        priceItems: [
          { priceItemId: 'plumber-tap', quantity: 3 },
          { priceItemId: 'plumber-flush', quantity: 1 },
        ],
      }),
      defaultCatalog,
    );

    // 3 taps (200-400 each) + 1 flush (300-600)
    expect(result.estimate).toEqual({ min: 900, max: 1800 });
    expect(result.priceLines).toHaveLength(2);
  });

  it('ignores ids the AI made up or took from another service', () => {
    const result = buildAnalysis(
      aiAnswer({
        skillIds: ['tap-repair', 'made-up-skill', 'fan'],
        priceItems: [
          { priceItemId: 'plumber-tap', quantity: 1 },
          { priceItemId: 'elec-fan-repair', quantity: 1 },
          { priceItemId: 'free-repair', quantity: 1 },
        ],
      }),
      defaultCatalog,
    );

    expect(result.skillIds).toEqual(['tap-repair']);
    expect(result.priceLines.map((l) => l.priceItemId)).toEqual(['plumber-tap']);
  });

  it('falls back to "Visit and check" when no price item fits', () => {
    const result = buildAnalysis(aiAnswer({ priceItems: [] }), defaultCatalog);

    expect(result.priceLines.map((l) => l.priceItemId)).toEqual(['plumber-visit']);
  });

  it('always treats a known emergency type as an emergency and adds our safety tips', () => {
    const result = buildAnalysis(
      aiAnswer({ serviceId: 'gas-fitter', urgency: 'urgent', emergencyType: 'gas-leak' }),
      defaultCatalog,
    );

    expect(result.urgency).toBe('emergency');
    expect(result.safetyTips.length).toBeGreaterThan(0);
    expect(result.emergencyNumber).toBe('999');
  });

  it('marks the problem as not understood when the service is unknown', () => {
    const result = buildAnalysis(
      aiAnswer({ serviceId: 'unknown', confidence: 'medium' }),
      defaultCatalog,
    );

    expect(result.understood).toBe(false);
    expect(result.estimate).toBeNull();
    expect(result.followUpQuestion).toBeTruthy();
  });

  it('decides itself whether the quick-path choice matches', () => {
    const answer = aiAnswer({ serviceId: 'ac-repair', matchesChosenService: true });

    expect(buildAnalysis(answer, defaultCatalog, 'plumber').matchesChosenService).toBe(false);
    expect(buildAnalysis(answer, defaultCatalog, 'ac-repair').matchesChosenService).toBe(true);
    expect(buildAnalysis(answer, defaultCatalog).matchesChosenService).toBe(true);
  });
});

describe('privacy', () => {
  it('removes phone numbers and emails before text goes to the AI', () => {
    const text = 'Tap leaking. Call me 01712345678 or +8801812-345678, mail rahim@example.com';

    expect(redactPersonalInfo(text)).toBe(
      'Tap leaking. Call me [phone removed] or [phone removed], mail [email removed]',
    );
    expect(buildUserPrompt({ text })).not.toContain('01712345678');
  });
});

describe('AI output schema', () => {
  it('only allows our service ids', () => {
    const schema = buildAiOutputSchema(defaultCatalog);

    expect(schema.safeParse(aiAnswer()).success).toBe(true);
    expect(schema.safeParse(aiAnswer({ serviceId: 'mechanic' })).success).toBe(false);
  });

  it('can be sent to Gemini as JSON Schema', () => {
    const jsonSchema = buildResponseJsonSchema(defaultCatalog);

    expect(jsonSchema.$schema).toBeUndefined();
    expect(jsonSchema.type).toBe('object');
  });
});
