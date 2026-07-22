import { describe, expect, it } from 'vitest';

import { analyzeGaps, summarizeGaps, type CitationRef } from './gap-analysis';

const prompts = [
  { id: 'p1', text: 'best crm' },
  { id: 'p2', text: 'cheapest crm' },
  { id: 'p3', text: 'crm for startups' },
];

const citations: CitationRef[] = [
  // p1: project cited on 2 engines, competitor cited on 1
  { promptId: 'p1', engine: 'openai', domain: 'acme.com' },
  { promptId: 'p1', engine: 'perplexity', domain: 'acme.com' },
  { promptId: 'p1', engine: 'openai', domain: 'rival.com' },
  // p2: only competitor cited -> gap
  { promptId: 'p2', engine: 'gemini', domain: 'rival.com' },
  // p3: nobody relevant cited
];

describe('analyzeGaps', () => {
  const result = analyzeGaps(prompts, 'acme.com', ['rival.com'], citations);

  it('counts distinct engines per domain', () => {
    expect(result[0].project.engineCount).toBe(2);
    expect(result[0].competitors[0].engineCount).toBe(1);
  });

  it('flags a gap when a competitor is cited but the project is not', () => {
    expect(result[1].isGap).toBe(true);
    expect(result[0].isGap).toBe(false); // project is cited on p1
    expect(result[2].isGap).toBe(false); // nobody cited on p3
  });

  it('summarizes coverage and gaps', () => {
    expect(summarizeGaps(result)).toEqual({ total: 3, projectCited: 1, gaps: 1 });
  });
});
