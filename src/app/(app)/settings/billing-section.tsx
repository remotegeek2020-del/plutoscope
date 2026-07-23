'use client';

import { useState, useTransition } from 'react';

import { openBillingPortal, startCheckout } from './billing-actions';

interface Props {
  tier: string;
  billingStatus: string;
  hasCustomer: boolean;
  isComplimentary?: boolean;
}

export function BillingSection({ tier, billingStatus, hasCustomer, isComplimentary }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: false; error: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (result && !result.ok) setError(result.error);
      // success paths redirect to Stripe.
    });

  return (
    <div className="mt-8 max-w-md border-t border-slate-200 pt-6 dark:border-slate-800">
      <h2 className="text-sm font-semibold">Billing</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Current plan: <span className="font-medium capitalize">{tier}</span>{' '}
        {isComplimentary ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Complimentary
          </span>
        ) : (
          <span className="text-slate-400">({billingStatus})</span>
        )}
      </p>

      {isComplimentary ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Your account has complimentary access — no billing is required.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => run(() => startCheckout('starter'))}
          disabled={isPending}
          className="rounded-md border border-instrument px-3 py-1.5 text-sm font-medium text-instrument disabled:opacity-60 dark:border-pluto dark:text-pluto"
        >
          Starter
        </button>
        <button
          onClick={() => run(() => startCheckout('consultant'))}
          disabled={isPending}
          className="rounded-md border border-instrument px-3 py-1.5 text-sm font-medium text-instrument disabled:opacity-60 dark:border-pluto dark:text-pluto"
        >
          Consultant
        </button>
        {hasCustomer ? (
          <button
            onClick={() => run(() => openBillingPortal())}
            disabled={isPending}
            className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Manage billing
          </button>
        ) : null}
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
