'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { runAudit } from '@/lib/audit/run-audit';
import { createClient } from '@/lib/supabase/server';

const inputSchema = z.object({
  projectId: z.string().uuid(),
  pageUrl: z.string().url(),
});

export type RunAuditResult = { ok: false; error: string } | { ok: true };

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
