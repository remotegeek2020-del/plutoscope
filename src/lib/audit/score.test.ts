import { describe, expect, it } from 'vitest';

import { scoreAudit } from './score';
import type { AuditFinding } from './types';

const f = (
  discipline: AuditFinding['discipline'],
  severity: AuditFinding['severity'],
  passed: boolean,
): AuditFinding => ({
  id: `${discipline}-${severity}-${passed}`,
  discipline,
  label: 'x',
  severity,
  passed,
  recommendation: passed ? undefined : 'fix it',
});

describe('scoreAudit', () => {
  it('scores 100 when everything passes', () => {
    const result = scoreAudit([
      f('seo', 'high', true),
      f('aeo', 'low', true),
      f('geo', 'medium', true),
    ]);
    expect(result.overall).toBe(100);
    expect(result.disciplines).toEqual({ seo: 100, aeo: 100, geo: 100 });
    expect(result.recommendations).toEqual([]);
  });

  it('weights by severity within a discipline', () => {
    // seo: high(3) passed, low(1) failed => 3/4 = 75
    const result = scoreAudit([f('seo', 'high', true), f('seo', 'low', false)]);
    expect(result.disciplines.seo).toBe(75);
  });

  it('returns 0 for a discipline with no findings', () => {
    const result = scoreAudit([f('seo', 'high', true)]);
    expect(result.disciplines.aeo).toBe(0);
    expect(result.disciplines.geo).toBe(0);
  });

  it('prioritizes recommendations by severity (high first)', () => {
    const result = scoreAudit([
      f('geo', 'low', false),
      f('seo', 'high', false),
      f('aeo', 'medium', false),
    ]);
    expect(result.recommendations.map((r) => r.severity)).toEqual(['high', 'medium', 'low']);
  });
});
