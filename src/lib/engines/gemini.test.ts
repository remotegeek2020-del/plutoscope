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

  it('returns [] when there is no grounding metadata', () => {
    expect(normalizeGemini({ candidates: [{}] })).toEqual([]);
    expect(normalizeGemini({})).toEqual([]);
  });
});
