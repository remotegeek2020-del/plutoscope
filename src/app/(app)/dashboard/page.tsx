import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

// Placeholder dashboard (the real visibility-index dashboard is Milestone 2 / Week 9). For now it
// lists the account's projects so the Week-5 Project Setup flow has a visible result.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label, topics(count), competitors(count)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Dashboard
        </h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white"
        >
          New project
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Placeholder — the visibility-index dashboard is built in Milestone 2 (Week 9).
      </p>

      {!projects || projects.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          No projects yet.{' '}
          <Link href="/projects/new" className="text-instrument underline dark:text-pluto">
            Set up your first project
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-md border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
            >
              <span className="font-medium">{project.label || project.domain}</span>
              <span className="ml-2 text-slate-400">{project.domain}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
