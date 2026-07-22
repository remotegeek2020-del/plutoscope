import { scoreAudit } from '@/lib/audit/score';
import type { AuditFinding, AuditSeverity } from '@/lib/audit/types';
import { createClient } from '@/lib/supabase/server';

import { AuditForm } from './audit-form';

export const dynamic = 'force-dynamic';

const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function DisciplineBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-slate-500 dark:text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-instrument dark:bg-pluto"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium">{value}</span>
    </div>
  );
}

export default async function AuditReportPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });

  const { data: reports } = await supabase
    .from('audit_reports')
    .select('id, page_url, overall_score, created_at, seo_findings, aeo_findings, geo_findings')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Audit Report
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Per-page SEO / AEO / GEO readiness with a prioritized fix list. Crawled via Firecrawl.
      </p>

      {!projects || projects.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Create a project first, then run an audit on any of its pages.
        </p>
      ) : (
        <AuditForm projects={projects} />
      )}

      <div className="mt-8 flex flex-col gap-4">
        {(reports ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No audits yet.</p>
        ) : (
          (reports ?? []).map((report) => {
            const findings = [
              ...((report.seo_findings ?? []) as unknown as AuditFinding[]),
              ...((report.aeo_findings ?? []) as unknown as AuditFinding[]),
              ...((report.geo_findings ?? []) as unknown as AuditFinding[]),
            ];
            const { disciplines, recommendations } = scoreAudit(findings);
            const passedCount = findings.filter((f) => f.passed).length;

            return (
              <div
                key={report.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{report.page_url}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(report.created_at).toLocaleString()} · {passedCount}/
                      {findings.length} checks passed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold tabular-nums">
                      {report.overall_score == null ? '—' : Math.round(report.overall_score)}
                    </div>
                    <div className="text-xs text-slate-400">overall</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  <DisciplineBar label="SEO" value={disciplines.seo} />
                  <DisciplineBar label="AEO" value={disciplines.aeo} />
                  <DisciplineBar label="GEO" value={disciplines.geo} />
                </div>

                {recommendations.length > 0 ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase text-slate-400">
                      Prioritized fixes
                    </div>
                    <ul className="mt-2 flex flex-col gap-2">
                      {recommendations.map((rec) => (
                        <li key={rec.id} className="flex items-start gap-2 text-sm">
                          <span
                            className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${SEVERITY_STYLES[rec.severity]}`}
                          >
                            {rec.severity}
                          </span>
                          <span>
                            <span className="font-medium">{rec.label}.</span>{' '}
                            <span className="text-slate-600 dark:text-slate-400">
                              {rec.recommendation}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-emerald-600">All checks passed. 🎉</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
