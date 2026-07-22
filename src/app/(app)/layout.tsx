import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getActiveProjectId, resolveActiveProject } from '@/lib/active-project';
import { createClient } from '@/lib/supabase/server';

import { ClientSwitcher } from './client-switcher';

// Shared shell for the authenticated app screens. Auth-gates every child route and hosts the
// consultant client switcher (Part VIII §47 Week 16).
const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects/new', label: 'Project Setup' },
  { href: '/audit', label: 'Audit Report' },
  { href: '/competitive', label: 'Competitive' },
  { href: '/briefs', label: 'Content Briefs' },
  { href: '/clients', label: 'Clients' },
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

  return (
    <div className="flex min-h-screen">
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
        </nav>
        <form action="/signout" method="post" className="mt-6">
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
