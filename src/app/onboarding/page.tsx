import { redirect } from 'next/navigation';

import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';

import { OnboardingClient } from './onboarding-client';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const account = await ensureAccount();
  if (account.onboarded_at) redirect('/dashboard');

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account.id);

  return <OnboardingClient tier={account.tier} hasProject={(count ?? 0) > 0} />;
}
