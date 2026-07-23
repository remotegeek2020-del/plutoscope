import { describe, expect, it } from 'vitest';

import { normalizeGemini } from './gemini';
import type { GeminiGroundingResponseShape } from './types';

const SAMPLE: GeminiGroundingResponseShape = {
  candidates: [
    {
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: 'https://www.hubspot.com/crm', title: 'HubSpot' } },
          { web: { uri: 'https://zoho.com/crm', title: 'Zoho' } },
        ],
        groundingSupports: [
          {
            segment: { text: 'HubSpot offers a free CRM.', startIndex: 0, endIndex: 26 },
            groundingChunkIndices: [0],
          },
        ],
      },
    },
  ],
};

describe('normalizeGemini', () => {
  it('parses groundingChunks into ordered citations and attaches support snippets', () => {
    const citations = normalizeGemini(SAMPLE);
    expect(citations).toEqual([
      {
        citedDomain: 'hubspot.com',
        sourceUrl: 'https://www.hubspot.com/crm',
        position: 1,
        snippet: 'HubSpot offers a free CRM.',
      },
      {
        citedDomain: 'zoho.com',
        sourceUrl: 'https://zoho.com/crm',
        position: 2,
        snippet: 'Zoho',
      },
    ]);
  });

  it('uses the real publisher domain from web.title when the uri is a Vertex redirect', () => {
    // Live grounding responses return `uri` as a vertexaisearch.cloud.google.com redirect and the
    // true domain in `title`. We must record the publisher, not the redirect host, and dedupe by
    // resolved domain (pnc.com cited via two different redirect uris counts once).
    const redirect = (id: string) =>
      `https://vertexaisearch.cloud.google.com/grounding-api-redirect/${id}`;
    const citations = normalizeGemini({
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: redirect('AAA'), title: 'pnc.com' } },
              { web: { uri: redirect('BBB'), title: 'wikipedia.org' } },
              { web: { uri: redirect('CCC'), title: 'pnc.com' } },
            ],
          },
        },
      ],
    });

    expect(citations.map((c) => c.citedDomain)).toEqual(['pnc.com', 'wikipedia.org']);
    expect(citations[0].sourceUrl).toBe(redirect('AAA'));
  });

  it('returns [] when there is no grounding metadata', () => {
    expect(normalizeGemini({ candidates: [{}] })).toEqual([]);
    expect(normalizeGemini({})).toEqual([]);
  });
});
