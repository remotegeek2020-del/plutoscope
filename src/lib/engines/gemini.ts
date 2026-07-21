import { getServerEnv } from '@/lib/env';
import { extractDomain } from '@/lib/tracking/url';
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
// Caveat (documented in docs/engine-response-shapes.md): grounding `uri`s are often Vertex
// redirect URLs (vertexaisearch.google.com/…). We extract the domain from the uri as-is for MVP;
// resolving the redirect to the true publisher domain requires an HTTP hop and is a later
// refinement (it can't happen inside the pure normalizer).

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
    const domain = extractDomain(uri);
    if (!uri || !domain || seen.has(uri)) return;
    seen.add(uri);

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
