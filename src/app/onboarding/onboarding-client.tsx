'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { startCheckout } from '@/app/(app)/settings/billing-actions';

import { completeOnboarding } from './actions';

export function OnboardingClient({ tier, hasProject }: { tier: string; hasProject: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const upgrade = (plan: 'starter' | 'consultant') =>
    startTransition(async () => {
      setError(null);
      const result = await startCheckout(plan);
      if (result && !result.ok) setError(result.error);
    });

  const step = (n: number, done: boolean, label: string, children?: React.ReactNode) => (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {children}
      </div>
    </li>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Welcome to Plutoscope
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Three quick steps to your first visibility report.
        </p>
      </div>

      <ol className="flex flex-col gap-6">
        {step(1, true, 'Account created')}

        {step(
          2,
          tier !== 'free',
          `Choose a plan (currently: ${tier})`,
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => upgrade('starter')}
              disabled={isPending}
              className="rounded-md border border-instrument px-3 py-1.5 text-sm font-medium text-instrument disabled:opacity-60 dark:border-pluto dark:text-pluto"
            >
              Starter
            </button>
            <button
              onClick={() => upgrade('consultant')}
              disabled={isPending}
              className="rounded-md border border-instrument px-3 py-1.5 text-sm font-medium text-instrument disabled:opacity-60 dark:border-pluto dark:text-pluto"
            >
              Consultant
            </button>
            <span className="text-xs text-slate-400">or continue on Free</span>
          </div>,
        )}

        {step(
          3,
          hasProject,
          'Set up your first project',
          <Link
            href="/projects/new"
            className="mt-2 inline-block rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white"
          >
            {hasProject ? 'Add another' : 'Set up a project'}
          </Link>,
        )}
      </ol>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form action={completeOnboarding}>
        <button className="rounded-md bg-instrument px-4 py-2 text-sm font-medium text-white">
          {hasProject ? 'Finish → Dashboard' : 'Skip to dashboard'}
        </button>
      </form>
    </main>
  );
}
