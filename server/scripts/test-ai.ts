// Runs the AI on the cases in ai-test-cases.json (needs GEMINI_API_KEY in .env)
// npm run test:ai -w server, or only some cases: npm run test:ai -w server -- 4 15
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProblem, createGeminiClient } from '../src/ai/gemini';
import type { AnalyzeInput } from '../src/ai/prompt';

interface TestCase {
  id: number;
  text: string;
  chosenServiceId?: string;
  // file names in scripts/test-images
  images?: string[];
  expect: {
    serviceId: string;
    urgency?: string[];
    matchesChosenService?: boolean;
    priceItem?: { id: string; quantity: number };
  };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.GEMINI_API_KEY;
const models = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  ...(
    process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite'
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
];
const delayMs = Number(process.env.AI_TEST_DELAY_MS ?? 7000);

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadImages(names: string[] = []): Promise<AnalyzeInput['images'] | null> {
  const images: NonNullable<AnalyzeInput['images']> = [];
  for (const name of names) {
    const file = path.join(here, 'test-images', name);
    if (!existsSync(file)) return null;
    const mimeType = MIME_TYPES[path.extname(name).toLowerCase()] ?? 'image/jpeg';
    images.push({ mimeType, base64: (await readFile(file)).toString('base64') });
  }
  return images;
}

async function main() {
  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing.');
    console.error('1. Get a free key at https://aistudio.google.com/apikey');
    console.error(
      '2. Copy server/.env.example to server/.env and paste the key after GEMINI_API_KEY=',
    );
    process.exit(1);
  }

  const allCases: TestCase[] = JSON.parse(
    await readFile(path.join(here, 'ai-test-cases.json'), 'utf8'),
  );
  const onlyIds = process.argv.slice(2).map(Number).filter(Boolean);
  const cases = onlyIds.length ? allCases.filter((c) => onlyIds.includes(c.id)) : allCases;

  const client = createGeminiClient(apiKey);
  console.log(
    `Model: ${models[0]} (backups: ${models.slice(1).join(', ')}) | ${cases.length} cases | ${delayMs / 1000}s wait between requests\n`,
  );

  let serviceOk = 0;
  let urgencyOk = 0;
  let urgencyChecked = 0;
  let passed = 0;
  let ran = 0;
  let totalLatency = 0;

  for (const [index, testCase] of cases.entries()) {
    if (index > 0) await sleep(delayMs);

    const images = await loadImages(testCase.images);
    if (images === null) {
      console.log(`SKIP #${testCase.id}: image missing in scripts/test-images`);
      continue;
    }

    try {
      const { result, latencyMs, model } = await analyzeProblem(client, models, {
        text: testCase.text,
        chosenServiceId: testCase.chosenServiceId,
        images,
      });
      ran++;
      totalLatency += latencyMs;

      const problems: string[] = [];
      const gotService = result.serviceId ?? 'unknown';
      if (gotService === testCase.expect.serviceId) serviceOk++;
      else problems.push(`service: expected ${testCase.expect.serviceId}, got ${gotService}`);

      if (testCase.expect.urgency) {
        urgencyChecked++;
        if (testCase.expect.urgency.includes(result.urgency)) urgencyOk++;
        else
          problems.push(
            `urgency: expected ${testCase.expect.urgency.join(' or ')}, got ${result.urgency}`,
          );
      }
      if (
        testCase.expect.matchesChosenService !== undefined &&
        testCase.expect.matchesChosenService !== result.matchesChosenService
      ) {
        problems.push(`matchesChosenService: expected ${testCase.expect.matchesChosenService}`);
      }
      if (testCase.expect.priceItem) {
        const line = result.priceLines.find((l) => l.priceItemId === testCase.expect.priceItem!.id);
        if (!line || line.quantity !== testCase.expect.priceItem.quantity) {
          problems.push(
            `price item: expected ${testCase.expect.priceItem.id} x${testCase.expect.priceItem.quantity}`,
          );
        }
      }

      if (problems.length === 0) passed++;
      const status = problems.length === 0 ? 'PASS' : 'FAIL';
      const price = result.estimate ? ` | Tk ${result.estimate.min}-${result.estimate.max}` : '';
      console.log(
        `${status} #${testCase.id} ${gotService} / ${result.urgency} (${result.confidence})${price} | ${(latencyMs / 1000).toFixed(1)}s${model === models[0] ? '' : ` | backup: ${model}`}`,
      );
      console.log(`     "${testCase.text}"`);
      console.log(`     -> ${result.summary}`);
      if (result.safetyTips.length) console.log(`     safety tips: ${result.emergencyType}`);
      if (result.followUpQuestion) console.log(`     asks: ${result.followUpQuestion}`);
      for (const problem of problems) console.log(`     !! ${problem}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`ERROR #${testCase.id}: ${message}`);
      if (message.includes('PerDay'))
        console.log(
          '     Daily free limit used up for every model. Check https://ai.dev/rate-limit',
        );
      else if (message.includes('429'))
        console.log('     Free-tier limit reached. Wait a minute, or raise AI_TEST_DELAY_MS.');
    }
  }

  if (ran === 0) return;
  console.log('\n----- Summary -----');
  console.log(`Cases passed:     ${passed}/${ran}`);
  console.log(`Service correct:  ${serviceOk}/${ran} (${Math.round((serviceOk / ran) * 100)}%)`);
  console.log(`Urgency correct:  ${urgencyOk}/${urgencyChecked}`);
  console.log(`Average time:     ${(totalLatency / ran / 1000).toFixed(1)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
