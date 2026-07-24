'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { ensureAccount } from '@/lib/accounts';
import { runAudit, runSiteAudit } from '@/lib/audit/run-audit';
import { createClient } from '@/lib/supabase/server';
import { getTierLimits } from '@/lib/tiers';

const inputSchema = z.object({
  projectId: z.string().uuid(),
  pageUrl: z.string().url(),
});

export type RunAuditResult = { ok: false; error: string } | { ok: true };
export type ScanSiteResult =
  | { ok: false; error: string }
  | { ok: true; audited: number; failed: number; discovered: number; limit: number };

export async function runAuditAction(input: unknown): Promise<RunAuditResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Choose a project and enter a valid page URL.' };

  // Confirm the caller owns the project (RLS returns only owned rows) before spending a crawl.
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', parsed.data.projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };

  try {
    await runAudit(parsed.data.projectId, parsed.data.pageUrl);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath('/audit');
  return { ok: true };
}

/** Whole-site scan: audit up to the tier's page cap and store a report per page. */
export async function scanSiteAction(input: unknown): Promise<ScanSiteResult> {
  const parsed = z.object({ projectId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Choose a project.' };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, domain')
    .eq('id', parsed.data.projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };

  const account = await ensureAccount();
  const limit = getTierLimits(account.tier).maxAuditPagesPerScan;

  try {
    const summary = await runSiteAudit(project.id, project.domain, limit);
    revalidatePath('/audit');
    return { ok: true, ...summary, limit };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
