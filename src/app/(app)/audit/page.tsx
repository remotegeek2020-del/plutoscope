import {
  DisciplineBadge,
  DisciplineGlossary,
} from '@/app/(app)/_components/discipline-glossary';
import { HelpNote } from '@/app/(app)/_components/help-note';
import {
  ScoreRatingBadge,
  ScoreRatingLegend,
} from '@/app/(app)/_components/score-rating';
import { scoreAudit } from '@/lib/audit/score';
import type { AuditFinding, AuditSeverity } from '@/lib/audit/types';
import { createClient } from '@/lib/supabase/server';

import { AuditForm } from './audit-form';

export const dynamic = 'force-dynamic';
// A whole-site scan crawls several pages in one request; give the server action headroom.
export const maxDuration = 60;

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
    .order('overall_score', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Audit Report
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Per-page SEO / AEO / GEO readiness with a prioritized fix list. Crawled via Firecrawl.
      </p>

      <HelpNote title="What does the Audit do, and how does it fix my problem?">
        <p>
          The Competitive screen tells you the AI doesn&apos;t cite you. The Audit tells you{' '}
          <strong>why</strong> — by inspecting one of your actual web pages.
        </p>
        <p className="font-medium">How it works:</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>
            <strong>Audit this page</strong> checks one URL, or <strong>Scan whole site</strong>{' '}
            finds your pages and audits them for you (up to your plan&apos;s page limit).
          </li>
          <li>Plutoscope crawls each page and runs 12 checks a search/AI engine cares about.</li>
          <li>
            It scores each page in three areas — <strong>SEO, AEO, GEO</strong> — and lists the exact
            fixes, worst first, each tagged with the area it improves.
          </li>
          <li>You (or your web person) apply the fixes; a stronger page is easier to cite and rank.</li>
        </ol>
        <p>Below, pages are sorted <strong>worst-scoring first</strong> — fix those to gain the most.</p>
        <p className="font-medium">What the three scores mean:</p>
        <DisciplineGlossary />
        <p className="font-medium">How to read the number:</p>
        <ScoreRatingLegend />
        <p>
          <strong>Audit vs. Content Briefs:</strong> a Brief creates a <em>new</em> page to fill a
          gap; the Audit improves an <em>existing</em> page. Both raise the same three scores.
        </p>
      </HelpNote>

      <HelpNote title="How do I add this code to my website?">
        <p>
          Some fixes give you a small piece of code to paste onto a page. You do{' '}
          <strong>not</strong> need a developer, and you don’t write anything — Plutoscope makes the
          code for you (in <strong>Content Briefs</strong>, the “page code” block, with a Copy
          button). Then you paste it. Here’s where, on the popular website builders:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>WordPress:</strong> edit the page, add a “Custom HTML” block, and paste the code
            there. (Or use a free plugin like “Insert Headers and Footers”.)
          </li>
          <li>
            <strong>Wix:</strong> Settings → Custom Code → Add code, paste it, and apply it to that
            page.
          </li>
          <li>
            <strong>Squarespace:</strong> page menu → Settings → Advanced → Code Injection, or add a
            “Code” block on the page.
          </li>
          <li>
            <strong>Shopify:</strong> edit the page and paste the code in the “Show HTML” (&lt;&gt;)
            view of the description box.
          </li>
        </ul>
        <p>
          <strong>Not sure or don’t want to?</strong> Copy the code and email it to whoever set up
          your website — it’s a 2-minute paste job for them, and you can tell them exactly where it
          goes.
        </p>
      </HelpNote>

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
                      <span className="text-sm font-normal text-slate-400"> / 100</span>
                    </div>
                    <div className="mt-0.5">
                      <ScoreRatingBadge value={report.overall_score} />
                    </div>
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
                          <DisciplineBadge discipline={rec.discipline} />
                          <div className="min-w-0">
                            <div className="font-medium">{rec.label}</div>
                            {rec.recommendation ? (
                              <div className="text-slate-600 dark:text-slate-400">
                                {rec.recommendation}
                              </div>
                            ) : null}
                            {rec.howToFix ? (
                              <div className="mt-1 rounded-md bg-slate-50 px-2 py-1.5 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                                <span className="font-semibold">How to fix: </span>
                                {rec.howToFix}
                              </div>
                            ) : null}
                          </div>
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
