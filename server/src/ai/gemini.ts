import { ApiError, GoogleGenAI } from '@google/genai';
import { buildAnalysis, type AnalysisResult } from './analysis';
import { defaultCatalog, type Catalog } from './catalog';
import { buildSystemInstruction, buildUserPrompt, type AnalyzeInput } from './prompt';
import { buildAiOutputSchema, buildResponseJsonSchema, type AiOutput } from './schema';

const AI_TIMEOUT_MS = 25_000;
const RETRYABLE_STATUS = new Set([429, 500, 503, 504]);

export interface AnalyzeOutcome {
  result: AnalysisResult;
  raw: AiOutput;
  latencyMs: number;
  model: string;
}

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    // no retries here, we move on to the next model instead
    httpOptions: { timeout: AI_TIMEOUT_MS, retryOptions: { attempts: 1 } },
  });
}

function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && RETRYABLE_STATUS.has(error.status);
}

export async function analyzeProblem(
  client: GoogleGenAI,
  models: string[],
  input: AnalyzeInput,
  catalog: Catalog = defaultCatalog,
): Promise<AnalyzeOutcome> {
  let lastError: unknown = new Error('No AI model configured.');

  for (const model of models) {
    try {
      return await analyzeWithModel(client, model, input, catalog);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }
  throw lastError;
}

async function analyzeWithModel(
  client: GoogleGenAI,
  model: string,
  input: AnalyzeInput,
  catalog: Catalog,
): Promise<AnalyzeOutcome> {
  const started = Date.now();

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildUserPrompt(input) },
          ...(input.images ?? []).map((image) => ({
            inlineData: { mimeType: image.mimeType, data: image.base64 },
          })),
        ],
      },
    ],
    config: {
      systemInstruction: buildSystemInstruction(catalog),
      responseMimeType: 'application/json',
      responseJsonSchema: buildResponseJsonSchema(catalog),
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error('The AI returned an empty answer.');

  const raw = buildAiOutputSchema(catalog).parse(JSON.parse(text));

  return {
    result: buildAnalysis(raw, catalog, input.chosenServiceId),
    raw,
    latencyMs: Date.now() - started,
    model,
  };
}
