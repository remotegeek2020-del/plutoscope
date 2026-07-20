import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.types';

export type Account = Tables<'accounts'>;

/**
 * Return the signed-in user's account, creating a free-tier one on first use. MVP is one account
 * per user (enforced by the accounts_owner_id_key unique constraint, migration 0006), so this is
 * race-safe: a concurrent insert that loses simply re-selects the winner. Plan selection during
 * onboarding (Week 20) upgrades the tier later.
 */
export async function ensureAccount(): Promise<Account> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('accounts')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('accounts')
    .insert({ owner_id: user.id, name: user.email ?? null, tier: 'free' })
    .select('*')
    .single();

  if (error) {
    // Likely a concurrent insert won the unique constraint — re-select the existing row.
    const { data: retry } = await supabase
      .from('accounts')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (retry) return retry;
    throw new Error(error.message);
  }

  return created;
}
