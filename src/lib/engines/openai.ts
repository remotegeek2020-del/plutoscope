import { getServerEnv } from '@/lib/env';
import { extractDomain } from '@/lib/tracking/url';
import type { Json } from '@/types/database.types';

import type {
  EngineAdapter,
  EngineRunInput,
  NormalizedCitation,
  OpenAIWebSearchResponseShape,
} from './types';

// OpenAI / ChatGPT adapter (Part III §19.1): Responses API with the `web_search` tool, parsing
// `url_citation` annotations. `normalize` is pure and unit-tested; `run` is the thin API call.
// The model is configurable via OPENAI_MODEL (generations advance — pick a current cost-effective
// one at deploy time; see the §17.2 pricing note).

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4o';

export function normalizeOpenAI(raw: OpenAIWebSearchResponseShape): NormalizedCitation[] {
  const citations: NormalizedCitation[] = [];
  const seen = new Set<string>();
  let position = 0;

  for (const item of raw.output ?? []) {
    for (const content of item.content ?? []) {
      const text = content.text;
      for (const annotation of content.annotations ?? []) {
        if (annotation.type !== 'url_citation') continue;
        const domain = extractDomain(annotation.url);
        if (!annotation.url || !domain || seen.has(annotation.url)) continue;
        seen.add(annotation.url);
        position += 1;

        const hasSpan =
          typeof annotation.start_index === 'number' && typeof annotation.end_index === 'number';
        const snippet =
          text && hasSpan
            ? text.slice(annotation.start_index, annotation.end_index)
            : annotation.title;

        citations.push({ citedDomain: domain, sourceUrl: annotation.url, position, snippet });
      }
    }
  }

  return citations;
}

export const openaiAdapter: EngineAdapter = {
  engine: 'openai',

  async run(input: EngineRunInput): Promise<Json> {
    const { OPENAI_API_KEY } = getServerEnv();
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
        tools: [{ type: 'web_search' }],
        input: input.promptText,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI Responses API error ${response.status}: ${body.slice(0, 500)}`);
    }

    return (await response.json()) as Json;
  },

  normalize(raw: Json): NormalizedCitation[] {
    return normalizeOpenAI(raw as unknown as OpenAIWebSearchResponseShape);
  },
};
