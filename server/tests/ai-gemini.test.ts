import { ApiError, type GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { analyzeProblem } from '../src/ai/gemini';

const goodAnswer = JSON.stringify({
  serviceId: 'plumber',
  skillIds: ['tap-repair'],
  summary: 'Kitchen tap is leaking.',
  urgency: 'normal',
  confidence: 'high',
  emergencyType: 'none',
  priceItems: [{ priceItemId: 'plumber-tap', quantity: 1 }],
  matchesChosenService: true,
  followUpQuestion: '',
});

/** A pretend Gemini client, so these tests never call Google */
function fakeClient(generateContent: ReturnType<typeof vi.fn>) {
  return { models: { generateContent } } as unknown as GoogleGenAI;
}

describe('analyzeProblem', () => {
  it('uses the main model when it answers', async () => {
    const generate = vi.fn().mockResolvedValue({ text: goodAnswer });

    const outcome = await analyzeProblem(fakeClient(generate), ['main', 'backup'], {
      text: 'kal theke pani porche',
    });

    expect(outcome.model).toBe('main');
    expect(outcome.result.serviceId).toBe('plumber');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('switches to the backup model when the main one is busy', async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ message: 'high demand', status: 503 }))
      .mockResolvedValueOnce({ text: goodAnswer });

    const outcome = await analyzeProblem(fakeClient(generate), ['main', 'backup'], {
      text: 'kal theke pani porche',
    });

    expect(outcome.model).toBe('backup');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('does not retry errors that another model cannot fix, like a bad API key', async () => {
    const generate = vi
      .fn()
      .mockRejectedValue(new ApiError({ message: 'API key not valid', status: 400 }));

    await expect(
      analyzeProblem(fakeClient(generate), ['main', 'backup'], { text: 'tap leaking' }),
    ).rejects.toThrow('API key not valid');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('rejects an answer that is not in our format', async () => {
    const generate = vi.fn().mockResolvedValue({ text: '{"serviceId":"mechanic"}' });

    await expect(
      analyzeProblem(fakeClient(generate), ['main'], { text: 'car broken' }),
    ).rejects.toThrow();
  });
});
