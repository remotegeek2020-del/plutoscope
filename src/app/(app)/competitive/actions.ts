'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';
import { getTierLimits } from '@/lib/tiers';
import { normalizeDomain } from '@/lib/tracking/url';

export type CompetitorActionResult = { ok: true } | { ok: false; error: string };

/**
 * Add a competitor domain to an existing project, enforcing the account's per-tier cap. Runs under
 * the user's session so RLS guarantees the project is theirs. Deduped so the same domain can't be
 * added twice (which would show as duplicate columns in the comparison).
 */
export async function addCompetitor(
  projectId: string,
  domainInput: string,
): Promise<CompetitorActionResult> {
  const pid = z.string().uuid().safeParse(projectId);
  if (!pid.success) return { ok: false, error: 'Invalid project.' };
  const domain = normalizeDomain(domainInput);
  if (!domain) return { ok: false, error: 'Enter a valid domain (e.g. competitor.com).' };

  const account = await ensureAccount();
  const limits = getTierLimits(account.tier);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('competitors')
    .select('id, domain')
    .eq('project_id', pid.data);

  if ((existing ?? []).some((c) => c.domain === domain)) {
    return { ok: false, error: `${domain} is already a competitor.` };
  }
  if ((existing ?? []).length >= limits.maxCompetitorsPerProject) {
    return {
      ok: false,
      error: `Your ${account.tier} plan allows up to ${limits.maxCompetitorsPerProject} competitor(s) per project.`,
    };
  }

  const { error } = await supabase
    .from('competitors')
    .insert({ project_id: pid.data, domain });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/competitive');
  return { ok: true };
}

/** Remove a competitor from its project (RLS owner-scoped). */
export async function removeCompetitor(competitorId: string): Promise<CompetitorActionResult> {
  const cid = z.string().uuid().safeParse(competitorId);
  if (!cid.success) return { ok: false, error: 'Invalid competitor.' };

  const supabase = await createClient();
  const { error } = await supabase.from('competitors').delete().eq('id', cid.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/competitive');
  return { ok: true };
}
