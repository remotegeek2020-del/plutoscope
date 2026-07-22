import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { IMPERSONATION_COOKIE } from '@/lib/admin/impersonation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Detail = {
  account: { id: string; name: string | null; tier: string; billing_status: string };
  projects: { id: string; domain: string; label: string | null; blended: number | null }[];
};

export default async function ViewingPage() {
  const sessionId = (await cookies()).get(IMPERSONATION_COOKIE)?.value;
  if (!sessionId) redirect('/admin');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_account_detail', { p_session: sessionId });
  if (error || !data) redirect('/admin');

  const detail = data as unknown as Detail;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Viewing: {detail.account.name ?? 'Account'}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Read-only support view · {detail.account.tier} · {detail.account.billing_status}
      </p>

      <h2 className="mt-6 text-sm font-semibold">Projects</h2>
      {detail.projects.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No projects.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {detail.projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
            >
              <span>
                <span className="font-medium">{project.label || project.domain}</span>
                <span className="ml-2 text-slate-400">{project.domain}</span>
              </span>
              <span className="tabular-nums text-slate-500">
                {project.blended === null ? '—' : Math.round(project.blended)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
