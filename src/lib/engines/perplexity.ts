import { getServerEnv } from '@/lib/env';
import { extractDomain } from '@/lib/tracking/url';
import type { Json } from '@/types/database.types';

import type {
  EngineAdapter,
  EngineRunInput,
  NormalizedCitation,
  PerplexitySonarResponseShape,
} from './types';

// Perplexity Sonar adapter (Part III §19.2). `run` calls the Sonar API for one prompt and returns
// the raw response verbatim (stored in TrackingRun.raw_response); `normalize` reduces it to
// Citation rows. `normalize` is pure and is the unit-tested contract; `run` is the thin API call.
//
// NOTE: this adapter runs server-side in the Next.js tracking processor, so PERPLEXITY_API_KEY is
// read from the (Vercel) server env. The documented response shape is verified against a live call
// the first time this runs in a deployed environment with the key present.

const SONAR_ENDPOINT = 'https://api.perplexity.ai/chat/completions';
const SONAR_MODEL = 'sonar';

export function normalizePerplexity(raw: PerplexitySonarResponseShape): NormalizedCitation[] {
  const citations: NormalizedCitation[] = [];
  const seenUrls = new Set<string>();

  const pushUnique = (url: string | undefined, position: number, snippet?: string): void => {
    const domain = extractDomain(url);
    if (!url || !domain || seenUrls.has(url)) return;
    seenUrls.add(url);
    citations.push({ citedDomain: domain, sourceUrl: url, position, snippet });
  };

  // Prefer structured `search_results` (carry title/snippet); fall back to the flat `citations`.
  const results = raw.search_results ?? [];
  if (results.length > 0) {
    results.forEach((result, index) => {
      pushUnique(result.url, index + 1, result.snippet ?? result.title);
    });
    return citations;
  }

  (raw.citations ?? []).forEach((url, index) => {
    pushUnique(url, index + 1);
  });
  return citations;
}

export const perplexityAdapter: EngineAdapter = {
  engine: 'perplexity',

  async run(input: EngineRunInput): Promise<Json> {
    const { PERPLEXITY_API_KEY } = getServerEnv();
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const response = await fetch(SONAR_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SONAR_MODEL,
        messages: [{ role: 'user', content: input.promptText }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Perplexity Sonar API error ${response.status}: ${body.slice(0, 500)}`);
    }

    return (await response.json()) as Json;
  },

  normalize(raw: Json): NormalizedCitation[] {
    return normalizePerplexity(raw as unknown as PerplexitySonarResponseShape);
  },
};
