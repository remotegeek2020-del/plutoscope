import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// Minimal authed page — proves the Week 1 auth + session flow end-to-end. The real Dashboard
// (Part III §20) is built in Milestone 2 / Week 9.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Account
      </h1>
      <dl className="text-sm">
        <div className="flex gap-2">
          <dt className="font-medium">Email:</dt>
          <dd className="text-slate-600 dark:text-slate-400">{user.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">User ID:</dt>
          <dd className="font-mono text-slate-600 dark:text-slate-400">{user.id}</dd>
        </div>
      </dl>

      <form action="/signout" method="post">
        <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">
          Sign out
        </button>
      </form>
    </main>
  );
}
