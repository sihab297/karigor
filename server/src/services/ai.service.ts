import type Anthropic from '@anthropic-ai/sdk';
import type { GoogleGenAI } from '@google/genai';
import { env, type Env } from '../config/env';
import type { Catalog } from '../ai/catalog';
import { analyzeWithClaude, createClaudeClient } from '../ai/claude';
import { analyzeProblem, createGeminiClient } from '../ai/gemini';
import { mockAnalyze } from '../ai/mock';
import type { AnalyzeOutcome } from '../ai/outcome';
import type { AnalyzeInput } from '../ai/prompt';
import { AppError } from '../utils/app-error';

type AiSettings = Pick<
  Env,
  | 'AI_MODE'
  | 'ANTHROPIC_API_KEY'
  | 'CLAUDE_MODEL'
  | 'GEMINI_API_KEY'
  | 'GEMINI_MODEL'
  | 'GEMINI_FALLBACK_MODELS'
>;

// tests pass their own fake clients
export interface AiClients {
  claude?: Anthropic;
  gemini?: GoogleGenAI;
}

const cached: AiClients = {};

// Claude is the main AI; Gemini answers when Claude fails or has no key
export async function analyzeWithAi(
  input: AnalyzeInput,
  catalog: Catalog,
  settings: AiSettings = env,
  clients: AiClients = cached,
): Promise<AnalyzeOutcome> {
  if (settings.AI_MODE === 'mock') return mockAnalyze(input, catalog);

  const claudeKey = settings.ANTHROPIC_API_KEY;
  const geminiKey = settings.GEMINI_API_KEY;

  if (!geminiKey) {
    if (!claudeKey) {
      throw new AppError(
        503,
        'AI_NOT_SET_UP',
        'The AI is not set up yet. Choose the service yourself.',
      );
    }
    // no backup: an error reaches the customer as "choose the service yourself"
    clients.claude ??= createClaudeClient(claudeKey);
    return analyzeWithClaude(clients.claude, settings.CLAUDE_MODEL, input, catalog);
  }

  if (claudeKey) {
    clients.claude ??= createClaudeClient(claudeKey);
    try {
      return await analyzeWithClaude(clients.claude, settings.CLAUDE_MODEL, input, catalog);
    } catch (error) {
      console.warn('Claude failed, trying Gemini:', error instanceof Error ? error.message : error);
    }
  }

  clients.gemini ??= createGeminiClient(geminiKey);
  return analyzeProblem(
    clients.gemini,
    [settings.GEMINI_MODEL, ...settings.GEMINI_FALLBACK_MODELS],
    input,
    catalog,
  );
}
