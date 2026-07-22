'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { ACTIVE_PROJECT_COOKIE } from '@/lib/active-project';
import { createClient } from '@/lib/supabase/server';

/** Set the active client/project (consultant switcher). Verifies ownership via RLS first. */
export async function setActiveProject(projectId: string): Promise<void> {
  if (!z.string().uuid().safeParse(projectId).success) return;

  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (!data) return; // not owned — RLS returned nothing

  const store = await cookies();
  store.set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
}
