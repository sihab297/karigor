import type { AnalysisResult } from './analysis';
import type { AiOutput } from './schema';

// what every AI provider (Claude, Gemini, mock) gives back
export interface AnalyzeOutcome {
  result: AnalysisResult;
  raw: AiOutput;
  latencyMs: number;
  model: string;
  // tokens used, when the provider reports them (for cost checks)
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
  };
}
