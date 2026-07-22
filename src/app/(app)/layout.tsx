import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getActiveProjectId, resolveActiveProject } from '@/lib/active-project';
import { IMPERSONATION_COOKIE } from '@/lib/admin/impersonation';
import { getStaffRole } from '@/lib/admin/staff';
import { createClient } from '@/lib/supabase/server';

import { endImpersonation } from './admin/actions';
import { ClientSwitcher } from './client-switcher';

// Shared shell for the authenticated app screens. Auth-gates every child route, hosts the
// consultant client switcher (Week 16), and shows the impersonation banner during staff support
// sessions (Part III §18.1).
const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects/new', label: 'Project Setup' },
  { href: '/audit', label: 'Audit Report' },
  { href: '/competitive', label: 'Competitive' },
  { href: '/briefs', label: 'Content Briefs' },
  { href: '/clients', label: 'Clients' },
  { href: '/settings', label: 'Settings' },
  { href: '/internal/runs', label: 'Tracking (internal)' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });
  const active = resolveActiveProject(projects ?? [], await getActiveProjectId());

  const staffRole = await getStaffRole();

  // Impersonation banner (Part III §18.1): unmissable, with an End Session control.
  const impersonationCookie = (await cookies()).get(IMPERSONATION_COOKIE)?.value;
  const impersonation = impersonationCookie
    ? ((await supabase.rpc('admin_active_impersonation', { p_session: impersonationCookie }))
        .data?.[0] ?? null)
    : null;

  return (
    <div className="min-h-screen">
      {impersonation ? (
        <div className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
          <span>
            Viewing as {impersonation.account_name ?? impersonation.account_domain ?? 'account'} —
            Admin Session (read-only, expires{' '}
            {new Date(impersonation.expires_at).toLocaleTimeString()})
          </span>
          <form action={endImpersonation}>
            <button className="rounded-md bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50">
              End Session
            </button>
          </form>
        </div>
      ) : null}
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800">
          <Link href="/" className="block text-lg font-semibold text-instrument dark:text-pluto">
            Plutoscope
          </Link>
          {projects && projects.length > 0 && active ? (
            <div className="mt-4">
              <span className="text-xs font-medium uppercase text-slate-400">Client</span>
              <div className="mt-1">
                <ClientSwitcher projects={projects} activeId={active.id} />
              </div>
            </div>
          ) : null}
          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
            {staffRole ? (
              <Link
                href="/admin"
                className="rounded-md px-3 py-2 text-sm font-medium text-instrument hover:bg-slate-100 dark:text-pluto dark:hover:bg-slate-800"
              >
                Admin
              </Link>
            ) : null}
          </nav>
          <form action="/signout" method="post" className="mt-6">
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              Sign out
            </button>
          </form>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
