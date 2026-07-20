import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Plutoscope
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          SEO + AEO + GEO visibility platform. Foundation scaffold (Phase 0, Week 1).
        </p>
      </div>

      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Signed in as {user.email}
          </span>
          <Link
            href="/account"
            className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white"
          >
            Account
          </Link>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-instrument px-4 py-2 text-sm font-medium text-white"
        >
          Log in
        </Link>
      )}
    </main>
  );
}
