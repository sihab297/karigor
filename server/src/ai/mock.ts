import { buildAnalysis } from './analysis';
import type { Catalog, PriceItem } from './catalog';
import type { AnalyzeOutcome } from './gemini';
import type { AnalyzeInput } from './prompt';
import { NO_EMERGENCY, UNKNOWN_SERVICE, type AiOutput, type Urgency } from './schema';

// free, offline stand-in for Gemini (AI_MODE=mock): looks for simple keywords in English, Banglish and Bangla

interface Rule {
  words: RegExp;
  also?: RegExp;
  priceItemId: string;
  summary: string;
  urgency?: Urgency;
  emergencyType?: string;
}

const rules: Rule[] = [
  {
    words: /gas|গ্যাস/i,
    also: /smell|gondh?o|গন্ধ|leak|লিক/i,
    priceItemId: 'gas-leak',
    summary: 'There is a gas smell in the home.',
    urgency: 'emergency',
    emergencyType: 'gas-leak',
  },
  {
    words: /spark|burning|pora|পোড়া|smoke|ধোঁয়া/i,
    priceItemId: 'elec-switch',
    summary: 'Sparks or a burning smell are coming from an electric point.',
    urgency: 'emergency',
    emergencyType: 'electric-spark',
  },
  {
    words: /water|pani|পানি/i,
    also: /switch|socket|light|সুইচ|সকেট|লাইট/i,
    priceItemId: 'plumber-pipe-leak',
    summary: 'Water is leaking near an electric point.',
    urgency: 'emergency',
    emergencyType: 'water-electric',
  },
  {
    words: /\bac\b|এসি|air ?con/i,
    also: /water|pani|পানি|drip|leak/i,
    priceItemId: 'ac-leak-fix',
    summary: 'Water is dripping from the AC.',
  },
  {
    words: /\bac\b|এসি|air ?con/i,
    also: /cool|thanda|ঠান্ডা/i,
    priceItemId: 'ac-repair-check',
    summary: 'The AC is not cooling.',
  },
  {
    words: /\bac\b|এসি|air ?con/i,
    priceItemId: 'ac-servicing',
    summary: 'The AC needs servicing.',
  },
  {
    words: /current nai|no power|no electricity|কারেন্ট নেই|বিদ্যুৎ নেই|tripping/i,
    priceItemId: 'elec-breaker',
    summary: 'There is no electricity in the home.',
    urgency: 'urgent',
  },
  { words: /\bips\b|\bups\b/i, priceItemId: 'elec-ips', summary: 'The IPS is not working.' },
  {
    words: /\bfan\b|pakha|পাখা|ফ্যান/i,
    priceItemId: 'elec-fan-repair',
    summary: 'The ceiling fan is not working.',
  },
  {
    words: /switch|socket|সুইচ|সকেট/i,
    priceItemId: 'elec-switch',
    summary: 'A switch or socket is broken.',
  },
  { words: /light|bulb|লাইট/i, priceItemId: 'elec-light', summary: 'A light needs fitting.' },
  {
    words: /commode|toilet|drain|block|ড্রেন|কমোড/i,
    priceItemId: 'plumber-drain',
    summary: 'The drain or commode is blocked.',
    urgency: 'urgent',
  },
  { words: /flush|ফ্লাশ/i, priceItemId: 'plumber-flush', summary: 'The flush is not working.' },
  {
    words: /\btaps?\b|\bkol\b|কল/i,
    priceItemId: 'plumber-tap',
    summary: 'A tap is leaking or needs replacing.',
  },
  {
    words: /pipe|leak|পাইপ|লিক/i,
    priceItemId: 'plumber-pipe-leak',
    summary: 'A water pipe is leaking.',
  },
  {
    words: /burner|chula|চুলা|stove/i,
    priceItemId: 'gas-burner',
    summary: 'The gas burner is not working properly.',
  },
  {
    words: /damp|স্যাঁতসেঁতে/i,
    priceItemId: 'paint-damp',
    summary: 'There are damp patches on the wall.',
  },
  { words: /paint|rong|রং/i, priceItemId: 'paint-room', summary: 'A room needs painting.' },
  {
    words: /lock|tala|তালা/i,
    priceItemId: 'carp-lock',
    summary: 'The door lock is broken.',
    urgency: 'urgent',
  },
  {
    words: /door|darja|দরজা/i,
    priceItemId: 'carp-door',
    summary: 'A door is not closing properly.',
  },
  {
    words: /furniture|chair|table|almirah|খাট|চেয়ার/i,
    priceItemId: 'carp-furniture-repair',
    summary: 'Some furniture is broken.',
  },
  { words: /sofa|carpet|সোফা/i, priceItemId: 'clean-sofa', summary: 'The sofa needs cleaning.' },
  { words: /tank|ট্যাংক/i, priceItemId: 'clean-tank', summary: 'The water tank needs cleaning.' },
  {
    words: /bathroom|বাথরুম/i,
    also: /clean|porishkar|পরিষ্কার/i,
    priceItemId: 'clean-bathroom',
    summary: 'A bathroom needs deep cleaning.',
  },
  {
    words: /clean|porishkar|পরিষ্কার/i,
    priceItemId: 'clean-home',
    summary: 'The home needs deep cleaning.',
  },
];

function findItem(catalog: Catalog, priceItemId: string) {
  for (const service of catalog.services) {
    const item = service.priceItems.find((p) => p.id === priceItemId);
    if (item) return { service, item };
  }
  return undefined;
}

// "3ta tap", "3 taps", "২টা কল"
function quantityIn(text: string) {
  const ascii = text.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const match = ascii.match(/(\d+)\s*(?:ta|টা|x)?\s*(?:taps?|fans?|lights?|কল|পাখা)/i);
  const count = match ? Number(match[1]) : 1;
  return count >= 1 && count <= 20 ? count : 1;
}

function answer(
  serviceId: string,
  item: PriceItem | undefined,
  summary: string,
  extra: Partial<AiOutput> = {},
): AiOutput {
  return {
    serviceId,
    skillIds: item?.skillId ? [item.skillId] : [],
    summary,
    urgency: 'normal',
    confidence: 'high',
    emergencyType: NO_EMERGENCY,
    priceItems: item ? [{ priceItemId: item.id, quantity: 1 }] : [],
    matchesChosenService: true,
    followUpQuestion: '',
    ...extra,
  };
}

export function mockAnalyze(input: AnalyzeInput, catalog: Catalog): AnalyzeOutcome {
  const text = input.text.trim();
  let raw: AiOutput | undefined;

  // a quick pick is the price item's own words, so it matches exactly
  for (const service of catalog.services) {
    const item = service.priceItems.find((p) => p.quickPick?.toLowerCase() === text.toLowerCase());
    if (item) {
      raw = answer(service.id, item, `${item.quickPick}.`);
      break;
    }
  }

  if (!raw) {
    const rule = rules.find((r) => r.words.test(text) && (!r.also || r.also.test(text)));
    const found = rule && findItem(catalog, rule.priceItemId);
    if (rule && found) {
      raw = answer(found.service.id, found.item, rule.summary, {
        urgency: rule.urgency ?? 'normal',
        emergencyType: rule.emergencyType ?? NO_EMERGENCY,
        priceItems: [{ priceItemId: found.item.id, quantity: quantityIn(text) }],
      });
    }
  }

  if (!raw && input.chosenServiceId) {
    const service = catalog.services.find((s) => s.id === input.chosenServiceId);
    if (service) {
      raw = answer(service.id, undefined, `The customer needs a ${service.name.toLowerCase()}.`, {
        confidence: 'medium',
      });
    }
  }

  raw ??= answer(UNKNOWN_SERVICE, undefined, 'The problem is not clear.', {
    confidence: 'low',
    followUpQuestion: 'What is broken or needs work at home?',
  });

  return {
    result: buildAnalysis(raw, catalog, input.chosenServiceId),
    raw,
    latencyMs: 0,
    model: 'mock',
  };
}
