import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { getAdapter } from '@/lib/engines';
import { computeAndStoreVisibilityScore } from '@/lib/scoring/compute-visibility';
import { createAdminClient } from '@/lib/supabase/admin';

import { MAX_ATTEMPTS, STALE_RUNNING_MS, shouldRetry } from './retry';

export interface ProcessResult {
  enqueued: number;
  reclaimed: number;
  claimed: number;
  succeeded: number;
  failed: number;
  retried: number;
  skippedNoAdapter: number;
  scored: number;
}

/**
 * One full scheduler tick: enqueue due runs, reclaim stale ones, then execute pending runs through
 * their engine adapter — store the raw response, write normalized Citation rows, and mark the run
 * succeeded, retried (back to pending), or dead-lettered (failed after MAX_ATTEMPTS). Runs with no
 * adapter yet (OpenAI/Gemini until Milestone 2) are left pending.
 *
 * Uses the service-role admin client (RLS bypass) — server-only. Triggered by Vercel Cron via the
 * secret-gated /api/internal/tracking/process route.
 */
export async function processPendingRuns(limit = 25): Promise<ProcessResult> {
  const supabase = createAdminClient();
  const result: ProcessResult = {
    enqueued: 0,
    reclaimed: 0,
    claimed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    skippedNoAdapter: 0,
    scored: 0,
  };
  const projectsToScore = new Set<string>();

  // 1. Enqueue due (prompt × engine) runs (best-effort; failures shouldn't block processing).
  const { data: enqueued, error: enqueueError } = await supabase.rpc('enqueue_due_tracking_runs');
  if (enqueueError) {
    console.error('[tracking] enqueue failed:', enqueueError.message);
  } else if (typeof enqueued === 'number') {
    result.enqueued = enqueued;
  }

  // 2. Reclaim runs stuck in `running` (a previous tick crashed mid-execution).
  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
  const { data: reclaimed } = await supabase
    .from('tracking_runs')
    .update({ status: 'pending' })
    .eq('status', 'running')
    .lt('claimed_at', staleBefore)
    .select('id');
  result.reclaimed = reclaimed?.length ?? 0;

  // 3. Execute pending runs.
  const { data: pending, error } = await supabase
    .from('tracking_runs')
    .select('id, engine, prompt_id, project_id, attempts, prompts(text)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  result.claimed = pending?.length ?? 0;

  for (const run of pending ?? []) {
    const adapter = getAdapter(run.engine);
    if (!adapter) {
      result.skippedNoAdapter += 1;
      continue;
    }

    const attempt = (run.attempts ?? 0) + 1;

    // Claim the row atomically (only if still pending); records the attempt.
    const { data: claimed } = await supabase
      .from('tracking_runs')
      .update({ status: 'running', claimed_at: new Date().toISOString(), attempts: attempt })
      .eq('id', run.id)
      .eq('status', 'pending')
      .select('id');
    if (!claimed || claimed.length === 0) continue;

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
      projectsToScore.add(run.project_id);
    } catch (err) {
      const message = (err as Error).message.slice(0, 1000);

      if (shouldRetry(attempt)) {
        // Transient: back to pending; a later tick retries it.
        await supabase
          .from('tracking_runs')
          .update({ status: 'pending', error: message })
          .eq('id', run.id);
        result.retried += 1;
      } else {
        // Dead-letter: permanently failed after MAX_ATTEMPTS. Log for investigation.
        console.error(
          `[tracking] run ${run.id} (${run.engine}) dead-lettered after ${attempt} attempts: ${message}`,
        );
        Sentry.captureException(err, {
          tags: { area: 'tracking', engine: run.engine },
          extra: { runId: run.id, attempts: attempt, maxAttempts: MAX_ATTEMPTS },
        });
        await supabase
          .from('tracking_runs')
          .update({ status: 'failed', run_at: new Date().toISOString(), error: message })
          .eq('id', run.id);
        result.failed += 1;
      }
    }
  }

  // Recompute the VisibilityScore for every project that got fresh citation data this cycle.
  for (const projectId of projectsToScore) {
    try {
      await computeAndStoreVisibilityScore(projectId);
      result.scored += 1;
    } catch (err) {
      console.error(`[scoring] failed for project ${projectId}: ${(err as Error).message}`);
    }
  }

  return result;
}
