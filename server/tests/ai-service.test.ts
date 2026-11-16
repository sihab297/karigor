import type Anthropic from '@anthropic-ai/sdk';
import type { GoogleGenAI } from '@google/genai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultCatalog } from '../src/ai/catalog';
import { analyzeWithAi } from '../src/services/ai.service';

const answer = {
  serviceId: 'electrician',
  skillIds: [],
  summary: 'Ceiling fan is not running.',
  urgency: 'normal',
  confidence: 'high',
  emergencyType: 'none',
  priceItems: [],
  matchesChosenService: true,
  followUpQuestion: '',
};

const base = {
  AI_MODE: 'real' as const,
  CLAUDE_MODEL: 'claude-opus-5-5',
  GEMINI_MODEL: 'gemini-3.8-flash',
  GEMINI_FALLBACK_MODELS: [],
};

// fake clients so tests never call Anthropic or Google
function fakeClients(claudeWorks: boolean) {
  const parse = claudeWorks
    ? vi.fn().mockResolvedValue({ stop_reason: 'end_turn', parsed_output: answer })
    : vi.fn().mockRejectedValue(new Error('Claude is down'));
  const generateContent = vi.fn().mockResolvedValue({ text: JSON.stringify(answer) });
  return {
    parse,
    generateContent,
    clients: {
      claude: { messages: { parse } } as unknown as Anthropic,
      gemini: { models: { generateContent } } as unknown as GoogleGenAI,
    },
  };
}

const input = { text: 'fan ghurche na' };

describe('analyzeWithAi: which AI answers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks Claude first when both keys are set', async () => {
    const fake = fakeClients(true);

    const outcome = await analyzeWithAi(
      input,
      defaultCatalog,
      { ...base, ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' },
      fake.clients,
    );

    expect(outcome.model).toBe('claude-opus-5-5');
    expect(fake.generateContent).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when Claude fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = fakeClients(false);

    const outcome = await analyzeWithAi(
      input,
      defaultCatalog,
      { ...base, ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' },
      fake.clients,
    );

    expect(fake.parse).toHaveBeenCalledTimes(1);
    expect(outcome.model).toBe('gemini-3.8-flash');
  });

  it('uses Gemini alone when there is no Claude key', async () => {
    const fake = fakeClients(true);

    const outcome = await analyzeWithAi(
      input,
      defaultCatalog,
      { ...base, GEMINI_API_KEY: 'g' },
      fake.clients,
    );

    expect(fake.parse).not.toHaveBeenCalled();
    expect(outcome.model).toBe('gemini-3.8-flash');
  });

  it('passes the error on when Claude fails and there is no Gemini key', async () => {
    const fake = fakeClients(false);

    await expect(
      analyzeWithAi(input, defaultCatalog, { ...base, ANTHROPIC_API_KEY: 'a' }, fake.clients),
    ).rejects.toThrow('Claude is down');
  });

  it('explains when no AI key is set', async () => {
    await expect(analyzeWithAi(input, defaultCatalog, base, {})).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_NOT_SET_UP',
    });
  });
});
