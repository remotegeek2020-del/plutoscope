'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';
import { getTierLimits } from '@/lib/tiers';
import { expandTopicToPrompts } from '@/lib/tracking/prompt-expansion';
import { normalizeDomain } from '@/lib/tracking/url';

const inputSchema = z.object({
  domain: z.string().min(1),
  label: z.string().optional(),
  topics: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
});

export type CreateProjectResult = { ok: false; error: string };

/**
 * Delete a project and everything under it (topics, prompts, tracking runs, citations, scores,
 * audits, briefs — all `on delete cascade`). Runs under the user's session, so RLS guarantees a
 * user can only delete a project their account owns.
 */
export async function deleteProject(projectId: string): Promise<{ ok: false; error: string } | void> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) return { ok: false, error: 'Invalid project.' };

  const supabase = await createClient();
  const { error } = await supabase.from('projects').delete().eq('id', parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/projects/new');
  revalidatePath('/dashboard');
  revalidatePath('/competitive');
}

/**
 * Create a Project with its Topics (each expanded into Prompts) and Competitors, enforcing the
 * account's per-tier caps. Runs under the user's session, so RLS guarantees the records attach to
 * an account the user owns. On success it redirects; it only returns on validation/failure.
 */
export async function createProject(input: unknown): Promise<CreateProjectResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const domain = normalizeDomain(parsed.data.domain);
  if (!domain) return { ok: false, error: 'Enter a valid domain (e.g. example.com).' };

  const account = await ensureAccount();
  const limits = getTierLimits(account.tier);
  const supabase = await createClient();

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account.id);
  if ((count ?? 0) >= limits.maxProjects) {
    return {
      ok: false,
      error: `Your ${account.tier} plan allows up to ${limits.maxProjects} project(s).`,
    };
  }

  const topics = parsed.data.topics
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, limits.maxTopicsPerProject);

  const competitors = Array.from(
    new Set(
      parsed.data.competitors.map((c) => normalizeDomain(c)).filter((d): d is string => Boolean(d)),
    ),
  ).slice(0, limits.maxCompetitorsPerProject);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ account_id: account.id, domain, label: parsed.data.label?.trim() || null })
    .select('id')
    .single();
  if (projectError || !project) {
    return { ok: false, error: projectError?.message ?? 'Could not create project.' };
  }

  if (competitors.length > 0) {
    const { error } = await supabase
      .from('competitors')
      .insert(competitors.map((d) => ({ project_id: project.id, domain: d })));
    if (error) return { ok: false, error: error.message };
  }

  for (const topicText of topics) {
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert({ project_id: project.id, text: topicText })
      .select('id')
      .single();
    if (topicError || !topic) {
      return { ok: false, error: topicError?.message ?? 'Could not create topic.' };
    }

    const prompts = expandTopicToPrompts(topicText, limits.maxPromptsPerTopic);
    if (prompts.length > 0) {
      const { error: promptError } = await supabase
        .from('prompts')
        .insert(prompts.map((text) => ({ topic_id: topic.id, project_id: project.id, text })));
      if (promptError) return { ok: false, error: promptError.message };
    }
  }

  // First project completes onboarding (idempotent — only sets it once).
  await supabase
    .from('accounts')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', account.id)
    .is('onboarded_at', null);

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
