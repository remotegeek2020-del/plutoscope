import Link from 'next/link';

import { HelpNote } from '@/app/(app)/_components/help-note';
import {
  ScoreRatingBadge,
  ScoreRatingLegend,
} from '@/app/(app)/_components/score-rating';
import { buildNextSteps } from '@/lib/dashboard/next-steps';
import { createClient } from '@/lib/supabase/server';

import { ScoreBar } from './_components/score-bar';
import { Sparkline } from './_components/sparkline';

export const dynamic = 'force-dynamic';

// A blended-index change of at least this many points is flagged as a significant drop/gain.
const ALERT_DELTA = 10;

type ScoreRow = {
  project_id: string;
  date: string;
  blended_index: number | null;
  geo_score: number | null;
  aeo_score: number | null;
  seo_score: number | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: scores } = projectIds.length
    ? await supabase
        .from('visibility_scores')
        .select('project_id, date, blended_index, geo_score, aeo_score, seo_score')
        .in('project_id', projectIds)
        .order('date', { ascending: true })
    : { data: [] as ScoreRow[] };

  // Group scores by project (already date-ascending).
  const scoresByProject = new Map<string, ScoreRow[]>();
  for (const row of (scores ?? []) as ScoreRow[]) {
    const list = scoresByProject.get(row.project_id) ?? [];
    list.push(row);
    scoresByProject.set(row.project_id, list);
  }

  const nextSteps = await buildNextSteps(supabase, projects ?? []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Dashboard
        </h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white"
        >
          New project
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Blended visibility index across ChatGPT, Perplexity, and Gemini. SEO joins once the
        rank-tracking vendor is wired.
      </p>

      {nextSteps.length > 0 ? (
        <section className="mt-6 rounded-xl border border-instrument/30 bg-instrument/5 p-4 dark:border-pluto/30 dark:bg-pluto/5">
          <h2 className="text-sm font-semibold text-instrument dark:text-pluto">Your next steps</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            The highest-impact things to do right now, based on your data.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {nextSteps.map((step) => (
              <li
                key={step.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{step.detail}</div>
                </div>
                <Link
                  href={step.href}
                  className="shrink-0 rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white"
                >
                  {step.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <HelpNote title="What do these numbers mean?">
        <p>
          Each card is one website you&apos;re tracking. The big number is its{' '}
          <strong>visibility index (0–100)</strong> — how often AI assistants mention that site when
          people ask about your topics. <strong>0</strong> = never mentioned yet;{' '}
          <strong>100</strong> = mentioned first, every time.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>GEO</strong> — do the AI answers (ChatGPT/Perplexity/Gemini) cite you at all?
          </li>
          <li>
            <strong>AEO</strong> — when they do, are you near the top of the answer?
          </li>
          <li>
            <strong>SEO</strong> — classic Google ranking. Shows &ldquo;n/a&rdquo; until we connect a
            rank-tracking vendor.
          </li>
        </ul>
        <p>
          A score of <strong>0</strong> isn&apos;t an error — it means the AIs aren&apos;t citing
          your domain yet. Head to <strong>Competitive</strong> to see who they cite instead, and{' '}
          <strong>Content Briefs</strong> to start changing it.
        </p>
        <ScoreRatingLegend />
      </HelpNote>

      {!projects || projects.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          No projects yet.{' '}
          <Link href="/projects/new" className="text-instrument underline dark:text-pluto">
            Set up your first project
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {projects.map((project) => {
            const series = scoresByProject.get(project.id) ?? [];
            const latest = series.at(-1) ?? null;
            const previous = series.length >= 2 ? series[series.length - 2] : null;
            const trend = series.map((s) => s.blended_index).filter((v): v is number => v !== null);

            const delta =
              latest?.blended_index != null && previous?.blended_index != null
                ? Math.round((latest.blended_index - previous.blended_index) * 10) / 10
                : null;
            const alerting = delta !== null && Math.abs(delta) >= ALERT_DELTA;

            return (
              <div
                key={project.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{project.label || project.domain}</div>
                    <div className="text-xs text-slate-400">{project.domain}</div>
                  </div>
                  {delta !== null ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        delta >= 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      } ${alerting ? 'ring-1 ring-current' : ''}`}
                      title={alerting ? 'Significant change' : undefined}
                    >
                      {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
                    </span>
                  ) : null}
                </div>

                {latest?.blended_index != null ? (
                  <>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-semibold tabular-nums">
                          {Math.round(latest.blended_index)}
                          <span className="text-base font-normal text-slate-400"> / 100</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-400">blended index</span>
                          <ScoreRatingBadge value={latest.blended_index} />
                        </div>
                      </div>
                      <Sparkline values={trend} />
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <ScoreBar label="GEO" value={latest.geo_score} />
                      <ScoreBar label="AEO" value={latest.aeo_score} />
                      <ScoreBar label="SEO" value={latest.seo_score} />
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    No tracking data yet — scores appear after the first tracking cycle runs.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
