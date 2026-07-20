import 'server-only';

import { getAdapter } from '@/lib/engines';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ProcessResult {
  claimed: number;
  succeeded: number;
  failed: number;
  skippedNoAdapter: number;
}

/**
 * Claim `pending` tracking_runs and execute them through their engine adapter: call the API,
 * store the raw response, write normalized Citation rows, and mark the run succeeded/failed.
 * Runs with no adapter yet (OpenAI/Gemini until Milestone 2) are left pending.
 *
 * Uses the service-role admin client (RLS bypass) — server-only. Basic error handling here;
 * retry/dead-letter handling is added in Week 6.
 */
export async function processPendingRuns(limit = 25): Promise<ProcessResult> {
  const supabase = createAdminClient();

  const { data: pending, error } = await supabase
    .from('tracking_runs')
    .select('id, engine, prompt_id, project_id, prompts(text)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const result: ProcessResult = {
    claimed: pending?.length ?? 0,
    succeeded: 0,
    failed: 0,
    skippedNoAdapter: 0,
  };

  for (const run of pending ?? []) {
    const adapter = getAdapter(run.engine);
    if (!adapter) {
      result.skippedNoAdapter += 1;
      continue;
    }

    // Claim the row (guard against a concurrent worker taking the same one).
    const { data: claimed, error: claimError } = await supabase
      .from('tracking_runs')
      .update({ status: 'running' })
      .eq('id', run.id)
      .eq('status', 'pending')
      .select('id');
    if (claimError || !claimed || claimed.length === 0) {
      continue;
    }

    // `prompts` comes back as an object (to-one) or array depending on the client version.
    const promptRel = run.prompts as { text?: string } | { text?: string }[] | null;
    const promptText = Array.isArray(promptRel)
      ? (promptRel[0]?.text ?? '')
      : (promptRel?.text ?? '');

    try {
      const raw = await adapter.run({
        projectId: run.project_id,
        promptId: run.prompt_id,
        promptText,
      });
      const citations = adapter.normalize(raw);

      if (citations.length > 0) {
        await supabase.from('citations').insert(
          citations.map((citation) => ({
            tracking_run_id: run.id,
            project_id: run.project_id,
            cited_domain: citation.citedDomain,
            source_url: citation.sourceUrl ?? null,
            position: citation.position ?? null,
            snippet: citation.snippet ?? null,
          })),
        );
      }

      await supabase
        .from('tracking_runs')
        .update({ status: 'succeeded', run_at: new Date().toISOString(), raw_response: raw })
        .eq('id', run.id);
      result.succeeded += 1;
    } catch (err) {
      await supabase
        .from('tracking_runs')
        .update({
          status: 'failed',
          run_at: new Date().toISOString(),
          error: (err as Error).message.slice(0, 1000),
        })
        .eq('id', run.id);
      result.failed += 1;
    }
  }

  return result;
}
