import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { analyzeWithClaude } from '../src/ai/claude';

const goodAnswer = {
  serviceId: 'plumber',
  skillIds: ['tap-repair'],
  summary: 'Kitchen tap is leaking.',
  urgency: 'normal',
  confidence: 'high',
  emergencyType: 'none',
  priceItems: [{ priceItemId: 'plumber-tap', quantity: 1 }],
  matchesChosenService: true,
  followUpQuestion: '',
};

// fake client so tests never call Anthropic
function fakeClient(parse: ReturnType<typeof vi.fn>) {
  return { messages: { parse } } as unknown as Anthropic;
}

describe('analyzeWithClaude', () => {
  it('turns a good answer into a result with our own prices', async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: 'end_turn', parsed_output: goodAnswer });

    const outcome = await analyzeWithClaude(fakeClient(parse), 'claude-opus-5-5', {
      text: 'kal theke pani porche',
    });

    expect(outcome.model).toBe('claude-opus-5-5');
    expect(outcome.result.serviceId).toBe('plumber');
    expect(outcome.result.estimate).not.toBeNull();
  });

  it('sends the photos before the words, with our answer format', async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: 'end_turn', parsed_output: goodAnswer });

    await analyzeWithClaude(fakeClient(parse), 'claude-opus-5-5', {
      text: 'tap leaking',
      images: [{ mimeType: 'image/jpeg', base64: 'abc' }],
    });

    const request = parse.mock.calls[0][0];
    expect(request.model).toBe('claude-opus-5-5');
    expect(request.output_config.format.type).toBe('json_schema');
    const content = request.messages[0].content;
    expect(content[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'abc' },
    });
    expect(content[1].type).toBe('text');
  });

  it('caches the instructions and reports the tokens used', async () => {
    const parse = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      parsed_output: goodAnswer,
      usage: {
        input_tokens: 120,
        output_tokens: 300,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 2500,
      },
    });

    const outcome = await analyzeWithClaude(fakeClient(parse), 'claude-opus-5-5', {
      text: 'tap leaking',
    });

    const request = parse.mock.calls[0][0];
    expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(outcome.usage).toEqual({
      inputTokens: 120,
      outputTokens: 300,
      cacheWriteTokens: 0,
      cacheReadTokens: 2500,
    });
  });

  it('fails when Claude declines to answer', async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: 'refusal', parsed_output: null });

    await expect(
      analyzeWithClaude(fakeClient(parse), 'claude-opus-5-5', { text: 'tap leaking' }),
    ).rejects.toThrow('declined');
  });

  it('fails when the answer is cut off', async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: 'max_tokens', parsed_output: null });

    await expect(
      analyzeWithClaude(fakeClient(parse), 'claude-opus-5-5', { text: 'tap leaking' }),
    ).rejects.toThrow('no usable answer');
  });
});
