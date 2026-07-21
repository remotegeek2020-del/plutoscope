import { describe, expect, it } from 'vitest';

import { computeVisibilityScores, positionWeight, type EngineCheck } from './visibility';

describe('positionWeight', () => {
  it('weights position 1 as 1.0 and decays for lower positions', () => {
    expect(positionWeight(1)).toBe(1);
    expect(positionWeight(3)).toBeCloseTo(0.5, 5); // 1/log2(4)
    expect(positionWeight(null)).toBe(0);
    expect(positionWeight(0)).toBe(0);
  });
});

describe('computeVisibilityScores', () => {
  it('returns null when there are no checks', () => {
    expect(computeVisibilityScores([])).toBeNull();
  });

  it('scores a perfect top-position domain at 100 across the board', () => {
    const checks: EngineCheck[] = [
      { cited: true, position: 1 },
      { cited: true, position: 1 },
    ];
    expect(computeVisibilityScores(checks)).toEqual({
      geo: 100,
      aeo: 100,
      seo: null,
      blended: 100,
    });
  });

  it('scores an uncited domain at 0', () => {
    const checks: EngineCheck[] = [
      { cited: false, position: null },
      { cited: false, position: null },
    ];
    expect(computeVisibilityScores(checks)).toEqual({ geo: 0, aeo: 0, seo: null, blended: 0 });
  });

  it('position-weights GEO and counts only top spots for AEO', () => {
    // one check cited at #3 (weight 0.5), one not cited.
    const scores = computeVisibilityScores([
      { cited: true, position: 3 },
      { cited: false, position: null },
    ]);
    // GEO = 100 * (0.5 + 0) / 2 = 25; AEO = 100 * 0/2 = 0; blended = 0.7*25 = 17.5
    expect(scores).toEqual({ geo: 25, aeo: 0, seo: null, blended: 17.5 });
  });
});
