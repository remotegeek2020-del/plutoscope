'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { IMPERSONATION_COOKIE } from '@/lib/admin/impersonation';
import { createClient } from '@/lib/supabase/server';

export type AdminActionResult = { ok: false; error: string };

const startSchema = z.object({
  targetAccountId: z.string().uuid(),
  reason: z.string().min(3, 'Enter a reason (min 3 chars).'),
});

/** Begin an audited, read-only, 30-min impersonation session. RPC verifies the caller is staff. */
export async function startImpersonation(input: unknown): Promise<AdminActionResult | void> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_start_impersonation', {
    p_target: parsed.data.targetAccountId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: error.message };

  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, data as string, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 30,
  });
  redirect('/admin/viewing');
}

/** End the current impersonation session (audited) and clear the cookie. */
export async function endImpersonation(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(IMPERSONATION_COOKIE)?.value;
  if (sessionId) {
    const supabase = await createClient();
    await supabase.rpc('admin_end_impersonation', { p_session: sessionId });
  }
  store.delete(IMPERSONATION_COOKIE);
  redirect('/admin');
}
