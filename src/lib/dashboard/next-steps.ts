import 'server-only';

import { analyzeGaps, summarizeGaps, type CitationRef } from '@/lib/competitive/gap-analysis';
import type { createClient } from '@/lib/supabase/server';
import { normalizeDomain } from '@/lib/tracking/url';

// Turns a user's tracking data into a short, prioritized list of plain, friendly actions — the
// "action-first" home. It is ADAPTIVE: it looks at what the user has already done (made a brief,
// approved it, run an audit) and at whether their score moved, then suggests the next step in the
// journey — gap → make a plan → approve it → publish the page → re-track → celebrate → next gap.
// Copy is deliberately simple (a busy owner, not an SEO expert, is reading it).

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface NextStep {
  key: string;
  priority: number; // lower = more important / shown first
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

  const [
    { data: prompts },
    { data: competitors },
    { data: runs },
    { data: briefs },
    { data: audits },
    { data: scoreRows },
  ] = await Promise.all([
    supabase.from('prompts').select('id, text, project_id, topic_id').in('project_id', projectIds),
    supabase.from('competitors').select('domain, project_id').in('project_id', projectIds),
    supabase
      .from('tracking_runs')
      .select('id, prompt_id, project_id, engine, run_at')
      .in('project_id', projectIds)
      .eq('status', 'succeeded')
      .order('run_at', { ascending: false }),
    supabase
      .from('content_briefs')
      .select('project_id, topic_id, status, created_at')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase.from('audit_reports').select('project_id').in('project_id', projectIds),
    supabase
      .from('visibility_scores')
      .select('project_id, date, blended_index')
      .in('project_id', projectIds)
      .order('date', { ascending: true }),
  ]);

  // Latest succeeded run per (prompt, engine).
  const runMeta = new Map<string, { promptId: string; engine: string; projectId: string }>();
  const seenRun = new Set<string>();
  for (const run of runs ?? []) {
    const key = `${run.prompt_id}:${run.engine}`;
    if (seenRun.has(key)) continue;
    seenRun.add(key);
    runMeta.set(run.id, { promptId: run.prompt_id, engine: run.engine, projectId: run.project_id });
  }
  const runIds = [...runMeta.keys()];

  const { data: citationRows } = runIds.length
    ? await supabase.from('citations').select('tracking_run_id, cited_domain').in('tracking_run_id', runIds)
    : { data: [] as { tracking_run_id: string; cited_domain: string }[] };

  // promptId -> topicId (to link a gap question to a topic, and its brief).
  const promptTopic = new Map<string, string | null>();
  for (const p of prompts ?? []) promptTopic.set(p.id, p.topic_id);

  // latest brief status per (project, topic).
  const briefStatus = new Map<string, string>(); // `${projectId}:${topicId}` -> status (latest first)
  for (const b of briefs ?? []) {
    if (!b.topic_id) continue;
    const key = `${b.project_id}:${b.topic_id}`;
    if (!briefStatus.has(key)) briefStatus.set(key, b.status);
  }

  const auditCount = new Map<string, number>();
  for (const a of audits ?? []) auditCount.set(a.project_id, (auditCount.get(a.project_id) ?? 0) + 1);

  // latest & previous blended index per project (for the "your score went up" moment).
  const scoresByProject = new Map<string, number[]>();
  for (const s of scoreRows ?? []) {
    if (s.blended_index == null) continue;
    const list = scoresByProject.get(s.project_id) ?? [];
    list.push(Number(s.blended_index));
    scoresByProject.set(s.project_id, list);
  }

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
        priority: 45,
        title: `Just a moment — ${name}`,
        detail: 'We are checking where you show up in AI answers. Come back soon to see your results.',
        href: '/internal/runs',
        cta: 'See progress',
      });
      continue;
    }

    // Did the score go up since last time? Celebrate it (a reward keeps people going).
    const series = scoresByProject.get(project.id) ?? [];
    if (series.length >= 2) {
      const latest = series[series.length - 1];
      const prev = series[series.length - 2];
      if (latest - prev >= 1) {
        steps.push({
          key: `${project.id}-up`,
          priority: 5,
          title: `🎉 Your score went up! — ${name}`,
          detail: `Nice work — you went from ${Math.round(prev)} to ${Math.round(latest)}. Keep going to climb higher.`,
          href: `/competitive?project=${project.id}`,
          cta: 'See what changed',
        });
      }
    }

    const comparisons = analyzeGaps(projectPrompts, domain, competitorDomains, citations);
    const summary = summarizeGaps(comparisons);
    const gaps = comparisons.filter((c) => c.isGap);

    if (gaps.length > 0) {
      // Where is this gap in the journey? Look at the brief for its topic.
      const gap = gaps[0];
      const topicId = promptTopic.get(gap.promptId);
      const status = topicId ? briefStatus.get(`${project.id}:${topicId}`) : undefined;

      if (!status) {
        steps.push({
          key: `${project.id}-gap`,
          priority: 10,
          title: `Get picked for “${gap.text}” — ${name}`,
          detail: 'Right now the AI tells people about other websites, not yours. Let’s make a page that gets you picked.',
          href: `/briefs?project=${project.id}`,
          cta: 'Make my plan',
        });
      } else if (status === 'draft') {
        steps.push({
          key: `${project.id}-approve`,
          priority: 8,
          title: `Finish your plan — ${name}`,
          detail: 'You started a plan to win this question. Read it, then click Approve when it looks good.',
          href: `/briefs?project=${project.id}`,
          cta: 'See my plan',
        });
      } else if (status === 'approved') {
        steps.push({
          key: `${project.id}-publish`,
          priority: 7,
          title: `Put your new page online — ${name}`,
          detail: 'Your plan is ready! Copy it onto your website and publish. Then check back so we can see if it worked.',
          href: `/briefs?project=${project.id}`,
          cta: 'Open my plan',
        });
      }
    } else if (summary.total > 0 && summary.projectCited < summary.total) {
      steps.push({
        key: `${project.id}-grow`,
        priority: 20,
        title: `Get picked for more questions — ${name}`,
        detail: `The AI names you for ${summary.projectCited} of ${summary.total} questions. Let’s make pages for the rest.`,
        href: `/briefs?project=${project.id}`,
        cta: 'Make a plan',
      });
    }

    // Suggest an audit once — only if they're cited somewhere and haven't audited yet.
    if (summary.projectCited > 0 && (auditCount.get(project.id) ?? 0) === 0) {
      steps.push({
        key: `${project.id}-audit`,
        priority: 30,
        title: `Check your page for problems — ${name}`,
        detail: 'See what is stopping your page from getting picked, and how to fix it.',
        href: '/audit',
        cta: 'Check my page',
      });
    }
  }

  steps.sort((a, b) => a.priority - b.priority);
  return steps.slice(0, 3);
}
