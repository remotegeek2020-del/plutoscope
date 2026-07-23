import { getServerEnv } from '@/lib/env';
import { extractDomain, normalizeDomain } from '@/lib/tracking/url';
import type { Json } from '@/types/database.types';

import type {
  EngineAdapter,
  EngineRunInput,
  GeminiGroundingResponseShape,
  NormalizedCitation,
} from './types';

// Gemini adapter (Part III §19.3): Gemini API with Google Search grounding, parsing
// `groundingChunks` (sources) + `groundingSupports` (which answer segment each source backs).
// Model configurable via GEMINI_MODEL. `normalize` is pure and unit-tested.
//
// Grounding `uri`s are Vertex redirect URLs (vertexaisearch.cloud.google.com/grounding-api-
// redirect/…) that mask the true publisher — so extracting the domain from the uri yields only the
// redirect host and no real source is ever detected (confirmed against live grounding responses).
// The real publisher domain is carried in `web.title` (e.g. "pnc.com", "wikipedia.org"), so we use
// that for `cited_domain` and keep the redirect uri as the click-through `source_url`. Deduped by
// resolved domain (a publisher cited via several redirect uris counts once, at its best position).

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export function normalizeGemini(raw: GeminiGroundingResponseShape): NormalizedCitation[] {
  const citations: NormalizedCitation[] = [];
  const seen = new Set<string>();

  const metadata = raw.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks ?? [];
  const supports = metadata?.groundingSupports ?? [];

  chunks.forEach((chunk, index) => {
    const uri = chunk.web?.uri;
    // Prefer the real publisher domain in `web.title` (only when it actually looks like a domain,
    // i.e. has a dot); otherwise fall back to the uri host. This keeps the redirect host out of the
    // results for grounded responses while still handling the odd non-domain title.
    const fromTitle = normalizeDomain(chunk.web?.title);
    const domain = fromTitle && fromTitle.includes('.') ? fromTitle : extractDomain(uri);
    if (!domain || seen.has(domain)) return;
    seen.add(domain);

    const support = supports.find((s) => s.groundingChunkIndices?.includes(index));
    citations.push({
      citedDomain: domain,
      sourceUrl: uri,
      position: index + 1,
      snippet: support?.segment?.text ?? chunk.web?.title,
    });
  });

  return citations;
}

export const geminiAdapter: EngineAdapter = {
  engine: 'gemini',

  async run(input: EngineRunInput): Promise<Json> {
    const { GEMINI_API_KEY } = getServerEnv();
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: input.promptText }] }],
        tools: [{ google_search: {} }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 500)}`);
    }

    return (await response.json()) as Json;
  },

  normalize(raw: Json): NormalizedCitation[] {
    return normalizeGemini(raw as unknown as GeminiGroundingResponseShape);
  },
};
