import { describe, expect, it } from 'vitest';

import { normalizeGemini } from '@/lib/engines/gemini';
import { normalizeOpenAI } from '@/lib/engines/openai';
import { normalizePerplexity } from '@/lib/engines/perplexity';
import type { NormalizedCitation } from '@/lib/engines/types';
import { normalizeDomain } from '@/lib/tracking/url';

import { computeVisibilityScores, type EngineCheck } from './visibility';

// End-to-end pipeline test (Part VIII §45 Week 10): raw engine payload -> adapter.normalize ->
// (prompt × engine) check -> blended VisibilityScore. This mirrors what compute-visibility.ts does
// against the DB, minus the live API/network — proving the data spine yields a correct blended
// index across all three engines. The live acceptance run happens in the deployed env with keys.

// Reproduces compute-visibility's per-run check: is `domain` cited, and at what min position.
function checkForDomain(citations: NormalizedCitation[], domain: string): EngineCheck {
  const positions = citations
    .filter((c) => c.citedDomain === domain)
    .map((c) => c.position ?? Number.POSITIVE_INFINITY);
  if (positions.length === 0) return { cited: false, position: null };
  const min = Math.min(...positions);
  return { cited: true, position: Number.isFinite(min) ? min : null };
}

describe('tracking → scoring pipeline', () => {
  const domain = normalizeDomain('acme.com')!;

  it('scores a domain cited #1 (Perplexity), #2 (OpenAI), absent (Gemini)', () => {
    const perplexityRaw = {
      search_results: [
        { url: 'https://acme.com/crm', title: 'Acme CRM', snippet: 'Acme' },
        { url: 'https://other.com', title: 'Other', snippet: 'Other' },
      ],
    };
    const openaiRaw = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Beta and Acme are options.',
              annotations: [
                {
                  type: 'url_citation' as const,
                  url: 'https://beta.com',
                  start_index: 0,
                  end_index: 4,
                },
                {
                  type: 'url_citation' as const,
                  url: 'https://www.acme.com/x',
                  start_index: 9,
                  end_index: 13,
                },
              ],
            },
          ],
        },
      ],
    };
    const geminiRaw = {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://gamma.com', title: 'Gamma' } }],
          },
        },
      ],
    };

    const checks: EngineCheck[] = [
      checkForDomain(normalizePerplexity(perplexityRaw), domain),
      checkForDomain(normalizeOpenAI(openaiRaw), domain),
      checkForDomain(normalizeGemini(geminiRaw), domain),
    ];

    expect(checks).toEqual([
      { cited: true, position: 1 },
      { cited: true, position: 2 },
      { cited: false, position: null },
    ]);

    // GEO = 100 * (1/log2(2) + 1/log2(3) + 0) / 3 = 54.36
    // AEO = 100 * (1 top-position of 3) = 33.33 ; blended = 0.7*54.36 + 0.3*33.33 = 48.05
    expect(computeVisibilityScores(checks)).toEqual({
      geo: 54.36,
      aeo: 33.33,
      seo: null,
      blended: 48.05,
    });
  });

  it('scores a domain that dominates every engine at 100', () => {
    const perplexityRaw = { search_results: [{ url: 'https://acme.com/a' }] };
    const openaiRaw = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Acme.',
              annotations: [
                {
                  type: 'url_citation' as const,
                  url: 'https://acme.com/b',
                  start_index: 0,
                  end_index: 4,
                },
              ],
            },
          ],
        },
      ],
    };
    const geminiRaw = {
      candidates: [
        { groundingMetadata: { groundingChunks: [{ web: { uri: 'https://acme.com/c' } }] } },
      ],
    };

    const checks: EngineCheck[] = [
      checkForDomain(normalizePerplexity(perplexityRaw), domain),
      checkForDomain(normalizeOpenAI(openaiRaw), domain),
      checkForDomain(normalizeGemini(geminiRaw), domain),
    ];

    expect(computeVisibilityScores(checks)).toEqual({
      geo: 100,
      aeo: 100,
      seo: null,
      blended: 100,
    });
  });
});
