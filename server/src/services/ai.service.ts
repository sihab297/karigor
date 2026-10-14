import type { GoogleGenAI } from '@google/genai';
import { env, type Env } from '../config/env';
import type { Catalog } from '../ai/catalog';
import { analyzeProblem, createGeminiClient, type AnalyzeOutcome } from '../ai/gemini';
import { mockAnalyze } from '../ai/mock';
import type { AnalyzeInput } from '../ai/prompt';
import { AppError } from '../utils/app-error';

type AiSettings = Pick<
  Env,
  'AI_MODE' | 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'GEMINI_FALLBACK_MODELS'
>;

let client: GoogleGenAI | undefined;

export async function analyzeWithAi(
  input: AnalyzeInput,
  catalog: Catalog,
  settings: AiSettings = env,
): Promise<AnalyzeOutcome> {
  if (settings.AI_MODE === 'mock') return mockAnalyze(input, catalog);

  if (!settings.GEMINI_API_KEY) {
    throw new AppError(
      503,
      'AI_NOT_SET_UP',
      'The AI is not set up yet. Choose the service yourself.',
    );
  }
  client ??= createGeminiClient(settings.GEMINI_API_KEY);
  return analyzeProblem(
    client,
    [settings.GEMINI_MODEL, ...settings.GEMINI_FALLBACK_MODELS],
    input,
    catalog,
  );
}
