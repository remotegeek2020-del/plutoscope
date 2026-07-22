import type { AuditDiscipline, AuditFinding, AuditSeverity } from './types';

// Audit scoring aggregation (Part VIII §46 Week 12). Turns rule findings into per-discipline
// scores (0–100, severity-weighted pass rate) + an overall score + a prioritized fix list
// (failed findings, most severe first). Pure and unit-tested.

const SEVERITY_WEIGHT: Record<AuditSeverity, number> = { high: 3, medium: 2, low: 1 };
const SEVERITY_ORDER: Record<AuditSeverity, number> = { high: 0, medium: 1, low: 2 };
const DISCIPLINES: AuditDiscipline[] = ['seo', 'aeo', 'geo'];

export interface AuditScore {
  overall: number;
  disciplines: Record<AuditDiscipline, number>;
  /** Failed findings, most severe first — the prioritized fix list. */
  recommendations: AuditFinding[];
}

function weightedScore(findings: AuditFinding[]): number {
  const total = findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
  if (total === 0) return 0;
  const passed = findings.reduce((sum, f) => sum + (f.passed ? SEVERITY_WEIGHT[f.severity] : 0), 0);
  return Math.round((passed / total) * 100);
}

export function scoreAudit(findings: AuditFinding[]): AuditScore {
  const disciplines = {} as Record<AuditDiscipline, number>;
  for (const discipline of DISCIPLINES) {
    disciplines[discipline] = weightedScore(findings.filter((f) => f.discipline === discipline));
  }

  const recommendations = findings
    .filter((f) => !f.passed)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return { overall: weightedScore(findings), disciplines, recommendations };
}
