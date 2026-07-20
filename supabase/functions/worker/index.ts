// Plutoscope tracking worker (Part VIII §43 Week 3 — the "execute" half of the scheduler).
//
// The pg_cron job `plutoscope-enqueue-tracking` (migration 0005) inserts `pending` tracking_runs.
// This worker claims those pending rows and dispatches each to the engine adapter for its engine,
// which will call the engine API, store the raw response, and write normalized Citation rows.
//
// SKELETON: the adapter registry is empty until Milestone 1 (Perplexity first, Week 4). Runs with
// no adapter yet are left `pending` (not failed) and reported as skipped, so wiring an adapter is
// the only change needed to make them process. Uses the service-role key (injected by the Edge
// runtime) and therefore bypasses RLS — this is trusted server-side code.
//
// Deploy: `supabase functions deploy worker` (or via the Supabase MCP). Scheduling the worker
// itself (pg_cron + pg_net, or the dashboard) is wired in Week 4 once there is real work to do.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BATCH_SIZE = 25;

// Engine adapter registry — populated starting Milestone 1. Shape (Week 4):
//   { run(input) => rawResponse, normalize(raw) => Citation[] }  (see src/lib/engines/types.ts)
const ADAPTERS: Record<string, unknown> = {};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: pending, error } = await supabase
    .from('tracking_runs')
    .select('id, engine, prompt_id, project_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let processed = 0;
  let skippedNoAdapter = 0;

  for (const run of pending ?? []) {
    const adapter = ADAPTERS[run.engine as string];
    if (!adapter) {
      // No adapter for this engine yet (skeleton). Leave the run pending for a future pass.
      skippedNoAdapter += 1;
      continue;
    }
    // Week 4+: mark running → adapter.run() → adapter.normalize() → insert citations →
    // mark succeeded (or failed + error on exception), with retry/dead-letter handling (Week 6).
    processed += 1;
  }

  return Response.json({
    ok: true,
    claimed: pending?.length ?? 0,
    processed,
    skippedNoAdapter,
  });
});
