import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { buildAnalysis } from './analysis';
import { defaultCatalog, type Catalog } from './catalog';
import type { AnalyzeOutcome } from './outcome';
import { buildSystemInstruction, buildUserPrompt, type AnalyzeInput } from './prompt';
import { buildAiOutputSchema } from './schema';

const AI_TIMEOUT_MS = 30_000;
const CLAUDE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ClaudeImageType = (typeof CLAUDE_IMAGE_TYPES)[number];

export function createClaudeClient(apiKey: string): Anthropic {
  // one quick retry; if Claude still fails we move on to Gemini
  return new Anthropic({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 1 });
}

function isClaudeImageType(type: string): type is ClaudeImageType {
  return (CLAUDE_IMAGE_TYPES as readonly string[]).includes(type);
}

function buildContent(input: AnalyzeInput): Anthropic.ContentBlockParam[] {
  const images: Anthropic.ImageBlockParam[] = (input.images ?? [])
    .filter((image) => isClaudeImageType(image.mimeType))
    .map((image) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType as ClaudeImageType,
        data: image.base64,
      },
    }));
  // photos first, then the words, so Claude reads the text with the photos in mind
  return [...images, { type: 'text', text: buildUserPrompt(input) }];
}

export async function analyzeWithClaude(
  client: Anthropic,
  model: string,
  input: AnalyzeInput,
  catalog: Catalog = defaultCatalog,
): Promise<AnalyzeOutcome> {
  const started = Date.now();
  const schema = buildAiOutputSchema(catalog);

  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    // the instructions and price list are the same for every check, so Claude caches them;
    // later checks within a few minutes read them for a small part of the normal price
    system: [
      { type: 'text', text: buildSystemInstruction(catalog), cache_control: { type: 'ephemeral' } },
    ],
    // choosing a service and price items is a short task, so keep thinking light
    output_config: { effort: 'low', format: zodOutputFormat(schema) },
    messages: [{ role: 'user', content: buildContent(input) }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to answer this problem.');
  }
  // checked against our schema by the SDK; null means the answer was cut off or empty
  const raw = response.parsed_output;
  if (!raw) throw new Error(`Claude gave no usable answer (stop reason: ${response.stop_reason}).`);

  return {
    result: buildAnalysis(raw, catalog, input.chosenServiceId),
    raw,
    latencyMs: Date.now() - started,
    model,
    usage: response.usage && {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}
