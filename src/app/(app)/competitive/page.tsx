import Link from 'next/link';

import { getActiveProjectId, resolveActiveProject } from '@/lib/active-project';
import {
  analyzeGaps,
  summarizeGaps,
  type CitationRef,
  type DomainPresence,
} from '@/lib/competitive/gap-analysis';
import { createClient } from '@/lib/supabase/server';
import { normalizeDomain } from '@/lib/tracking/url';

export const dynamic = 'force-dynamic';

function Cell({ presence }: { presence: DomainPresence }) {
  if (presence.engineCount === 0)
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return <span className="font-medium tabular-nums">{presence.engineCount}/3</span>;
}

export default async function CompetitiveViewPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const supabase = await createClient();
  const { project: projectParam } = await searchParams;

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });

  if (!projects || projects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Competitive View
        </h1>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Create a project with competitors first, then compare citation share here.
        </p>
      </div>
    );
  }

  const active =
    resolveActiveProject(projects, await getActiveProjectId(), projectParam) ?? projects[0];
  const projectDomain = normalizeDomain(active.domain) ?? active.domain;

  const [{ data: competitors }, { data: prompts }, { data: runs }] = await Promise.all([
    supabase.from('competitors').select('domain').eq('project_id', active.id),
    supabase.from('prompts').select('id, text').eq('project_id', active.id),
    supabase
      .from('tracking_runs')
      .select('id, prompt_id, engine, run_at')
      .eq('project_id', active.id)
      .eq('status', 'succeeded')
      .order('run_at', { ascending: false }),
  ]);

  const competitorDomains = (competitors ?? [])
    .map((c) => normalizeDomain(c.domain))
    .filter((d): d is string => Boolean(d));

  // Latest succeeded run per (prompt, engine).
  const latestRun = new Map<string, { promptId: string; engine: string }>();
  for (const run of runs ?? []) {
    const key = `${run.prompt_id}:${run.engine}`;
    if (!latestRun.has(key)) latestRun.set(key, { promptId: run.prompt_id, engine: run.engine });
  }
  const runIdByKey = new Map<string, string>();
  for (const run of runs ?? []) {
    const key = `${run.prompt_id}:${run.engine}`;
    if (!runIdByKey.has(key)) runIdByKey.set(key, run.id);
  }
  const runIds = [...runIdByKey.values()];
  const runMeta = new Map<string, { promptId: string; engine: string }>();
  for (const [key, id] of runIdByKey) runMeta.set(id, latestRun.get(key)!);

  const relevantDomains = [projectDomain, ...competitorDomains];
  const { data: citationRows } = runIds.length
    ? await supabase
        .from('citations')
        .select('tracking_run_id, cited_domain')
        .in('tracking_run_id', runIds)
        .in('cited_domain', relevantDomains)
    : { data: [] };

  const citations: CitationRef[] = (citationRows ?? [])
    .map((row) => {
      const meta = runMeta.get(row.tracking_run_id);
      return meta
        ? { promptId: meta.promptId, engine: meta.engine, domain: row.cited_domain }
        : null;
    })
    .filter((c): c is CitationRef => c !== null);

  const comparisons = analyzeGaps(prompts ?? [], projectDomain, competitorDomains, citations);
  const summary = summarizeGaps(comparisons);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Competitive View
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Who gets cited across your tracked prompts — you vs. your competitors, per engine (of 3).
      </p>

      {projects.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/competitive?project=${p.id}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p.id === active.id
                  ? 'bg-instrument text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p.label || p.domain}
            </Link>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-sm">
        Cited on <span className="font-semibold">{summary.projectCited}</span> of{' '}
        <span className="font-semibold">{summary.total}</span> prompts.{' '}
        {summary.gaps > 0 ? (
          <span className="text-red-600 dark:text-red-400">
            {summary.gaps} gap{summary.gaps === 1 ? '' : 's'} — prompts a competitor wins that you
            don&apos;t.
          </span>
        ) : (
          <span className="text-emerald-600">No competitor-only gaps.</span>
        )}
      </p>

      {competitorDomains.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No competitors for this project yet — add up to 3 in Project Setup to compare.
        </p>
      ) : null}

      {(prompts ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          No prompts yet for this project.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="py-2 pr-4 font-medium">Prompt</th>
                <th className="py-2 pr-4 font-medium">You ({projectDomain})</th>
                {competitorDomains.map((d) => (
                  <th key={d} className="py-2 pr-4 font-medium">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr
                  key={row.promptId}
                  className={`border-b border-slate-100 dark:border-slate-900 ${
                    row.isGap ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                  }`}
                >
                  <td className="py-2 pr-4">
                    {row.text}
                    {row.isGap ? (
                      <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
                        gap
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">
                    <Cell presence={row.project} />
                  </td>
                  {row.competitors.map((c) => (
                    <td key={c.domain} className="py-2 pr-4">
                      <Cell presence={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
