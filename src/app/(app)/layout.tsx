import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// Shared shell for the authenticated app screens. Placeholder scaffold (Week 3) — real screens
// are filled in across Milestones 1–4 (Part III §20). Auth-gates every child route.
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

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800">
        <Link href="/" className="block text-lg font-semibold text-instrument dark:text-pluto">
          Plutoscope
        </Link>
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
