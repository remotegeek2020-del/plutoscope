import { describe, expect, it } from 'vitest';

import { normalizeOpenAI } from './openai';
import type { OpenAIWebSearchResponseShape } from './types';

const SAMPLE: OpenAIWebSearchResponseShape = {
  output: [
    {
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'HubSpot and Salesforce are popular CRMs.',
          annotations: [
            {
              type: 'url_citation',
              url: 'https://www.hubspot.com/crm',
              start_index: 0,
              end_index: 7,
            },
            {
              type: 'url_citation',
              url: 'https://www.salesforce.com',
              title: 'Salesforce',
              start_index: 12,
              end_index: 22,
            },
            // duplicate URL — should be dropped
            {
              type: 'url_citation',
              url: 'https://www.hubspot.com/crm',
              start_index: 0,
              end_index: 7,
            },
          ],
        },
      ],
    },
  ],
};

describe('normalizeOpenAI', () => {
  it('parses url_citation annotations into ordered, deduped citations', () => {
    const citations = normalizeOpenAI(SAMPLE);
    expect(citations).toEqual([
      {
        citedDomain: 'hubspot.com',
        sourceUrl: 'https://www.hubspot.com/crm',
        position: 1,
        snippet: 'HubSpot',
      },
      {
        citedDomain: 'salesforce.com',
        sourceUrl: 'https://www.salesforce.com',
        position: 2,
        snippet: 'Salesforce',
      },
    ]);
  });

  it('ignores non-url_citation annotations and returns [] when empty', () => {
    expect(normalizeOpenAI({ output: [] })).toEqual([]);
    expect(
      normalizeOpenAI({
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'x' }] }],
      }),
    ).toEqual([]);
  });
});
