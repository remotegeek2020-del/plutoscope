import Link from 'next/link';

import { getActiveProjectId } from '@/lib/active-project';
import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';
import { getTierLimits } from '@/lib/tiers';

import { ClientList } from './client-list';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const account = await ensureAccount();
  const limits = getTierLimits(account.tier);
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });
  const activeId = await getActiveProjectId();

  const count = projects?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Clients
        </h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white"
        >
          New client
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Switch between client projects. {count} of {limits.maxProjects} on your {account.tier} plan.
      </p>

      {count === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          No clients yet.{' '}
          <Link href="/projects/new" className="text-instrument underline dark:text-pluto">
            Add your first client project
          </Link>
          .
        </p>
      ) : (
        <ClientList clients={projects ?? []} activeId={activeId} />
      )}
    </div>
  );
}
