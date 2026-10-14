import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../src/ai/catalog';
import { mockAnalyze } from '../src/ai/mock';
import { analyzeWithAi } from '../src/services/ai.service';

const mock = (text: string, chosenServiceId?: string) =>
  mockAnalyze({ text, chosenServiceId }, defaultCatalog).result;

describe('mock AI', () => {
  it.each([
    ['রান্নাঘরের কল দিয়ে পানি পড়ছে', 'plumber', 'normal'],
    ['fan ghurche na', 'electrician', 'normal'],
    ['রান্নাঘরে গ্যাসের গন্ধ পাচ্ছি', 'gas-fitter', 'emergency'],
    ['socket theke sparks berocche', 'electrician', 'emergency'],
    ['AC theke pani porche', 'ac-repair', 'normal'],
    ['commode block hoye geche', 'plumber', 'urgent'],
    ['pura basay current nai', 'electrician', 'urgent'],
    ['The bedroom wall has damp patches', 'painter', 'normal'],
    ['main darjar lock bhenge geche', 'carpenter', 'urgent'],
    ['sofa ar carpet clean korate chai', 'cleaner', 'normal'],
  ])('reads "%s" as %s (%s)', (text, service, urgency) => {
    const result = mock(text);

    expect(result.serviceId).toBe(service);
    expect(result.urgency).toBe(urgency);
  });

  it('adds our safety tips for emergencies', () => {
    const result = mock('গ্যাসের গন্ধ');

    expect(result.emergencyType).toBe('gas-leak');
    expect(result.safetyTips.length).toBeGreaterThan(0);
    expect(result.emergencyNumber).toBe('999');
  });

  it('prices the job from our list, with the number of items', () => {
    const result = mock('3ta tap change korte hobe');

    expect(result.priceLines).toEqual([
      expect.objectContaining({
        priceItemId: 'plumber-tap',
        quantity: 3,
        minPrice: 600,
        maxPrice: 1200,
      }),
    ]);
  });

  it('understands quick picks exactly', () => {
    const result = mock('IPS not working', 'electrician');

    expect(result.serviceId).toBe('electrician');
    expect(result.priceLines[0]!.priceItemId).toBe('elec-ips');
    expect(result.matchesChosenService).toBe(true);
  });

  it('notices when the chosen service does not fit', () => {
    const result = mock('AC theke pani porche', 'plumber');

    expect(result.serviceId).toBe('ac-repair');
    expect(result.matchesChosenService).toBe(false);
  });

  it('uses the chosen service when the words are not clear', () => {
    const result = mock('please come and check', 'carpenter');

    expect(result.serviceId).toBe('carpenter');
    expect(result.priceLines[0]!.priceItemId).toBe('carp-visit');
    expect(result.confidence).toBe('medium');
  });

  it('asks a question when it cannot tell', () => {
    const result = mock('Can you help me with my homework?');

    expect(result.understood).toBe(false);
    expect(result.followUpQuestion).toBeTruthy();
  });

  it('says it is the mock', () => {
    expect(mockAnalyze({ text: 'fan' }, defaultCatalog).model).toBe('mock');
  });
});

describe('analyzeWithAi', () => {
  const settings = {
    GEMINI_MODEL: 'gemini-3.8-flash',
    GEMINI_FALLBACK_MODELS: ['gemini-3.6-flash'],
  };

  it('uses the mock when AI_MODE is mock', async () => {
    const outcome = await analyzeWithAi({ text: 'fan not working' }, defaultCatalog, {
      ...settings,
      AI_MODE: 'mock',
    });

    expect(outcome.model).toBe('mock');
  });

  it('explains when real mode has no key', async () => {
    await expect(
      analyzeWithAi({ text: 'fan' }, defaultCatalog, { ...settings, AI_MODE: 'real' }),
    ).rejects.toMatchObject({ statusCode: 503, code: 'AI_NOT_SET_UP' });
  });
});
