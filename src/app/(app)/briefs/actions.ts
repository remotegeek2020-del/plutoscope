'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { analyzeGaps, type CitationRef } from '@/lib/competitive/gap-analysis';
import { generateBriefDraft } from '@/lib/content/generate-brief';
import { createClient } from '@/lib/supabase/server';
import { normalizeDomain } from '@/lib/tracking/url';

export type BriefActionResult = { ok: false; error: string } | { ok: true };

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Build a human-readable citation-gap summary for a topic from the latest tracking data. */
async function buildGapContext(
  supabase: Supabase,
  projectId: string,
  topicId: string,
  projectDomain: string,
  topicText: string,
): Promise<string> {
  const [{ data: prompts }, { data: competitors }] = await Promise.all([
    supabase.from('prompts').select('id, text').eq('topic_id', topicId),
    supabase.from('competitors').select('domain').eq('project_id', projectId),
  ]);

  const promptIds = (prompts ?? []).map((p) => p.id);
  const competitorDomains = (competitors ?? [])
    .map((c) => normalizeDomain(c.domain))
    .filter((d): d is string => Boolean(d));

  const { data: runs } = promptIds.length
    ? await supabase
        .from('tracking_runs')
        .select('id, prompt_id, engine, run_at')
        .eq('project_id', projectId)
        .eq('status', 'succeeded')
        .in('prompt_id', promptIds)
        .order('run_at', { ascending: false })
    : { data: [] };

  const runMeta = new Map<string, { promptId: string; engine: string }>();
  const seen = new Set<string>();
  for (const run of runs ?? []) {
    const key = `${run.prompt_id}:${run.engine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    runMeta.set(run.id, { promptId: run.prompt_id, engine: run.engine });
  }

  const runIds = [...runMeta.keys()];
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
  const total = comparisons.length;
  const projectCited = comparisons.filter((c) => c.project.engineCount > 0).length;
  const gaps = comparisons.filter((c) => c.isGap);

  const competitorTally = new Map<string, number>();
  for (const comparison of comparisons) {
    for (const competitor of comparison.competitors) {
      if (competitor.engineCount > 0) {
        competitorTally.set(competitor.domain, (competitorTally.get(competitor.domain) ?? 0) + 1);
      }
    }
  }
  const competitorLines = [...competitorTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([domain, n]) => `${domain} (cited on ${n}/${total || 0} prompts)`);

  return [
    `Topic: "${topicText}".`,
    `Your domain (${projectDomain}) is cited on ${projectCited}/${total} tracked prompts.`,
    competitorLines.length
      ? `Competitors cited: ${competitorLines.join(', ')}.`
      : 'No competitor citations recorded yet.',
    gaps.length
      ? `Prompts where a competitor is cited but you are not: ${gaps.map((g) => `"${g.text}"`).join('; ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const generateSchema = z.object({ projectId: z.string().uuid(), topicId: z.string().uuid() });

export async function generateBrief(input: unknown): Promise<BriefActionResult> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, domain')
    .eq('id', parsed.data.projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };

  const { data: topic } = await supabase
    .from('topics')
    .select('id, text')
    .eq('id', parsed.data.topicId)
    .maybeSingle();
  if (!topic) return { ok: false, error: 'Topic not found.' };

  const projectDomain = normalizeDomain(project.domain) ?? project.domain;
  const gapContext = await buildGapContext(
    supabase,
    project.id,
    topic.id,
    projectDomain,
    topic.text,
  );

  try {
    const draft = await generateBriefDraft(topic.text, gapContext);
    const { error } = await supabase.from('content_briefs').insert({
      project_id: project.id,
      topic_id: topic.id,
      gap_summary: gapContext,
      draft_content: draft,
      status: 'draft',
    });
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath('/briefs');
  return { ok: true };
}

const saveSchema = z.object({ briefId: z.string().uuid(), draftContent: z.string() });

export async function saveBrief(input: unknown): Promise<BriefActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('content_briefs')
    .update({ draft_content: parsed.data.draftContent })
    .eq('id', parsed.data.briefId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/briefs');
  return { ok: true };
}

const approveSchema = z.object({
  briefId: z.string().uuid(),
  status: z.enum(['draft', 'approved', 'archived']),
});

export async function setBriefStatus(input: unknown): Promise<BriefActionResult> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('content_briefs')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.briefId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/briefs');
  return { ok: true };
}
