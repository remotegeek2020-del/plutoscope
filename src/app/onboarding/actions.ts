'use server';

import { redirect } from 'next/navigation';

import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';

/** Mark onboarding complete and go to the dashboard. */
export async function completeOnboarding(): Promise<void> {
  const account = await ensureAccount();
  const supabase = await createClient();
  await supabase
    .from('accounts')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', account.id);
  redirect('/dashboard');
}
