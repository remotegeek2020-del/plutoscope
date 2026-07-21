import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeDomain } from '@/lib/tracking/url';

import { computeVisibilityScores, type EngineCheck } from './visibility';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compute and upsert a project's VisibilityScore for a period (default today). A "check" is the
 * latest succeeded tracking run per (prompt × engine); we look up whether the project's domain was
 * cited in it and at what position, then score with the founder-approved formula. Server-only
 * (service-role). Called from the processor after a tracking cycle.
 */
export async function computeAndStoreVisibilityScore(
  projectId: string,
  date: string = today(),
): Promise<void> {
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from('projects')
    .select('domain')
    .eq('id', projectId)
    .single();
  if (!project) return;

  const domain = normalizeDomain(project.domain);
  if (!domain) return;

  // Latest succeeded run per (prompt, engine).
  const { data: runs } = await supabase
    .from('tracking_runs')
    .select('id, prompt_id, engine, run_at')
    .eq('project_id', projectId)
    .eq('status', 'succeeded')
    .order('run_at', { ascending: false });
  if (!runs || runs.length === 0) return;

  const latestRunIdByCheck = new Map<string, string>();
  for (const run of runs) {
    const key = `${run.prompt_id}:${run.engine}`;
    if (!latestRunIdByCheck.has(key)) latestRunIdByCheck.set(key, run.id);
  }
  const runIds = [...latestRunIdByCheck.values()];

  // Min citation position of the project's domain within each of those runs.
  const { data: citations } = await supabase
    .from('citations')
    .select('tracking_run_id, position')
    .in('tracking_run_id', runIds)
    .eq('cited_domain', domain);

  const positionByRun = new Map<string, number | null>();
  for (const citation of citations ?? []) {
    const existing = positionByRun.get(citation.tracking_run_id);
    const position = citation.position ?? null;
    if (existing === undefined) {
      positionByRun.set(citation.tracking_run_id, position);
    } else if (position !== null && (existing === null || position < existing)) {
      positionByRun.set(citation.tracking_run_id, position);
    }
  }

  const checks: EngineCheck[] = runIds.map((id) => {
    const cited = positionByRun.has(id);
    return { cited, position: cited ? (positionByRun.get(id) ?? null) : null };
  });

  const scores = computeVisibilityScores(checks);
  if (!scores) return;

  await supabase.from('visibility_scores').upsert(
    {
      project_id: projectId,
      date,
      geo_score: scores.geo,
      aeo_score: scores.aeo,
      seo_score: scores.seo,
      blended_index: scores.blended,
    },
    { onConflict: 'project_id,date' },
  );
}
