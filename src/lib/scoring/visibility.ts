// Visibility scoring (Part VIII §45 Week 8; founder-approved 2026-07-21).
//
// Pure, unit-tested. Each (prompt × engine) "check" is whether the tracked domain was cited in
// that engine's answer, and at what position:
//   * GEO  = 100 × average of 1/log2(position+1) over all checks (cited #1 ≈ 1.0, lower worth
//            less, not cited = 0) — the position-weighted AI-citation rate.
//   * AEO  = 100 × fraction of checks where the domain is the TOP-cited source ("the answer").
//   * SEO  = null in MVP — Google organic rank needs the rank-tracking vendor (still an open
//            founder decision), so it isn't scored yet.
//   * Blended index = 0.7 × GEO + 0.3 × AEO while SEO is absent (re-weight once SEO exists).

export interface EngineCheck {
  cited: boolean;
  /** 1-based position of the tracked domain in the engine's answer, or null if not cited/ranked. */
  position: number | null;
}

export interface VisibilityScores {
  geo: number;
  aeo: number;
  seo: number | null;
  blended: number;
}

export function positionWeight(position: number | null): number {
  if (!position || position < 1) return 0;
  return 1 / Math.log2(position + 1);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compute the scores for a set of checks. Returns null when there is no data to score. */
export function computeVisibilityScores(checks: EngineCheck[]): VisibilityScores | null {
  if (checks.length === 0) return null;

  const geoRaw =
    checks.reduce((sum, c) => sum + (c.cited ? positionWeight(c.position) : 0), 0) / checks.length;
  const aeoRaw = checks.filter((c) => c.cited && c.position === 1).length / checks.length;

  const geo = round2(geoRaw * 100);
  const aeo = round2(aeoRaw * 100);
  const blended = round2(0.7 * geo + 0.3 * aeo);

  return { geo, aeo, seo: null, blended };
}
