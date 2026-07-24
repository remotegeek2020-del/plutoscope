import 'server-only';

import { analyzeGaps, summarizeGaps, type CitationRef } from '@/lib/competitive/gap-analysis';
import type { createClient } from '@/lib/supabase/server';
import { normalizeDomain } from '@/lib/tracking/url';

// Turns a user's tracking data into a short, prioritized list of plain-English actions — the
// "action-first" home. Instead of making the user read charts and decide what to do, we surface the
// single most useful next step per project (close a competitor gap, get cited on more questions,
// or strengthen an existing page) with a button that goes straight to the tool.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface NextStep {
  key: string;
  priority: number;
  title: string;
  detail: string;
  href: string;
  cta: string;
}

export async function buildNextSteps(
  supabase: Supabase,
  projects: { id: string; domain: string; label: string | null }[],
): Promise<NextStep[]> {
  if (projects.length === 0) return [];
  const projectIds = projects.map((p) => p.id);

  const [{ data: prompts }, { data: competitors }, { data: runs }] = await Promise.all([
    supabase.from('prompts').select('id, text, project_id').in('project_id', projectIds),
    supabase.from('competitors').select('domain, project_id').in('project_id', projectIds),
    supabase
      .from('tracking_runs')
      .select('id, prompt_id, project_id, engine, run_at')
      .in('project_id', projectIds)
      .eq('status', 'succeeded')
      .order('run_at', { ascending: false }),
  ]);

  // Latest succeeded run per (prompt, engine).
  const runMeta = new Map<string, { promptId: string; engine: string; projectId: string }>();
  const seen = new Set<string>();
  for (const run of runs ?? []) {
    const key = `${run.prompt_id}:${run.engine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    runMeta.set(run.id, {
      promptId: run.prompt_id,
      engine: run.engine,
      projectId: run.project_id,
    });
  }
  const runIds = [...runMeta.keys()];

  const { data: citationRows } = runIds.length
    ? await supabase.from('citations').select('tracking_run_id, cited_domain').in('tracking_run_id', runIds)
    : { data: [] as { tracking_run_id: string; cited_domain: string }[] };

  const steps: NextStep[] = [];

  for (const project of projects) {
    const domain = normalizeDomain(project.domain) ?? project.domain;
    const name = project.label || project.domain;

    const projectPrompts = (prompts ?? [])
      .filter((p) => p.project_id === project.id)
      .map((p) => ({ id: p.id, text: p.text }));
    const competitorDomains = (competitors ?? [])
      .filter((c) => c.project_id === project.id)
      .map((c) => normalizeDomain(c.domain))
      .filter((d): d is string => Boolean(d));

    const citations: CitationRef[] = (citationRows ?? [])
      .map((row) => {
        const meta = runMeta.get(row.tracking_run_id);
        if (!meta || meta.projectId !== project.id) return null;
        return { promptId: meta.promptId, engine: meta.engine, domain: row.cited_domain };
      })
      .filter((c): c is CitationRef => c !== null);

    const hasData = [...runMeta.values()].some((m) => m.projectId === project.id);
    if (!hasData) {
      steps.push({
        key: `${project.id}-nodata`,
        priority: 40,
        title: `Waiting for first results — ${name}`,
        detail: 'Tracking runs on a schedule. Once it runs, you’ll see where you stand and what to fix.',
        href: '/internal/runs',
        cta: 'View tracking',
      });
      continue;
    }

    const comparisons = analyzeGaps(projectPrompts, domain, competitorDomains, citations);
    const summary = summarizeGaps(comparisons);
    const gaps = comparisons.filter((c) => c.isGap);

    if (gaps.length > 0) {
      steps.push({
        key: `${project.id}-gap`,
        priority: 10,
        title: `Win ${gaps.length} question${gaps.length === 1 ? '' : 's'} you’re losing — ${name}`,
        detail: `A competitor is recommended and you’re not, e.g. “${gaps[0].text}”. Generate a page brief to close the gap.`,
        href: `/briefs?project=${project.id}`,
        cta: 'Generate a brief',
      });
    } else if (summary.total > 0 && summary.projectCited < summary.total) {
      steps.push({
        key: `${project.id}-grow`,
        priority: 20,
        title: `Get cited on more questions — ${name}`,
        detail: `You’re cited on ${summary.projectCited} of ${summary.total} tracked questions. Add content to cover the rest.`,
        href: `/briefs?project=${project.id}`,
        cta: 'Generate a brief',
      });
    }

    if (summary.projectCited > 0) {
      steps.push({
        key: `${project.id}-audit`,
        priority: 30,
        title: `Strengthen your pages — ${name}`,
        detail: 'Audit a key page to see what’s holding back its SEO/AEO/GEO score, with prioritized fixes.',
        href: '/audit',
        cta: 'Run an audit',
      });
    }
  }

  steps.sort((a, b) => a.priority - b.priority);
  return steps.slice(0, 3);
}
