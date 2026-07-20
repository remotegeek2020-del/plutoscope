import { describe, expect, it } from 'vitest';

import { normalizePerplexity } from './perplexity';
import type { PerplexitySonarResponseShape } from './types';

// Sample shaped like a real Sonar response (Part III §19.2 / docs/engine-response-shapes.md).
// This stands in for the live-verification step until the key is available in a deployed env.
const SAMPLE_WITH_SEARCH_RESULTS: PerplexitySonarResponseShape = {
  choices: [{ message: { content: 'CRM options include…' } }],
  search_results: [
    { url: 'https://www.hubspot.com/products/crm', title: 'HubSpot CRM', snippet: 'Free CRM.' },
    { url: 'https://www.salesforce.com/crm/', title: 'Salesforce', snippet: 'Sales cloud.' },
    { url: 'https://www.hubspot.com/products/crm', title: 'HubSpot (dup)', snippet: 'dup' },
  ],
};

const SAMPLE_LEGACY_CITATIONS: PerplexitySonarResponseShape = {
  choices: [{ message: { content: '…' } }],
  citations: ['https://zoho.com/crm', 'https://pipedrive.com'],
};

describe('normalizePerplexity', () => {
  it('parses structured search_results into ordered citations', () => {
    const citations = normalizePerplexity(SAMPLE_WITH_SEARCH_RESULTS);
    expect(citations).toEqual([
      {
        citedDomain: 'hubspot.com',
        sourceUrl: 'https://www.hubspot.com/products/crm',
        position: 1,
        snippet: 'Free CRM.',
      },
      {
        citedDomain: 'salesforce.com',
        sourceUrl: 'https://www.salesforce.com/crm/',
        position: 2,
        snippet: 'Sales cloud.',
      },
    ]);
  });

  it('deduplicates repeated source URLs', () => {
    const citations = normalizePerplexity(SAMPLE_WITH_SEARCH_RESULTS);
    expect(citations).toHaveLength(2);
  });

  it('falls back to the legacy flat citations array', () => {
    const citations = normalizePerplexity(SAMPLE_LEGACY_CITATIONS);
    expect(citations.map((c) => c.citedDomain)).toEqual(['zoho.com', 'pipedrive.com']);
    expect(citations[0].position).toBe(1);
  });

  it('returns an empty array when there are no citations', () => {
    expect(normalizePerplexity({ choices: [] })).toEqual([]);
  });

  it('skips entries whose URL does not parse to a domain', () => {
    const citations = normalizePerplexity({ citations: ['not-a-url', 'https://valid.com/x'] });
    expect(citations.map((c) => c.citedDomain)).toEqual(['valid.com']);
  });
});
