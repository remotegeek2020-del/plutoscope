'use server';

import { revalidatePath } from 'next/cache';

import { getStaffRole } from '@/lib/admin/staff';
import { processPendingRuns } from '@/lib/tracking/process-runs';

export type RunNowResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

/**
 * Manually run one scheduler tick (enqueue → execute → score) on demand — the same work Vercel
 * Cron does hourly, but triggered from the UI for testing/inspection. Staff-only, because each run
 * makes paid engine API calls; enqueue is interval-idempotent, so repeated clicks won't re-run a
 * prompt that was just tracked.
 */
export async function runTrackingNow(): Promise<RunNowResult> {
  const role = await getStaffRole();
  if (!role) return { ok: false, error: 'Staff only.' };

  try {
    const r = await processPendingRuns();
    revalidatePath('/internal/runs');
    return {
      ok: true,
      summary: `enqueued ${r.enqueued} · succeeded ${r.succeeded} · failed ${r.failed} · retried ${r.retried} · scored ${r.scored}`,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
