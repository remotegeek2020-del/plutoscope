'use client';

import { useState, useTransition } from 'react';

import { setComplimentary } from './actions';

/**
 * Super-admin control to grant/revoke complimentary (comped) access — a paid tier with no Stripe
 * subscription. When granting, staff pick which tier to comp to.
 */
export function CompToggle({
  accountId,
  isComplimentary,
  compReason,
}: {
  accountId: string;
  isComplimentary: boolean;
  compReason: string | null;
}) {
  const [tier, setTier] = useState<'starter' | 'consultant'>('consultant');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (complimentary: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await setComplimentary({ accountId, complimentary, tier, reason });
      if (result && !result.ok) setError(result.error);
    });

  if (isComplimentary) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Comp{compReason ? ` · ${compReason}` : ''}
        </span>
        <button
          onClick={() => submit(false)}
          disabled={isPending}
          className="w-fit text-xs text-red-600 underline disabled:opacity-60"
        >
          Revoke
        </button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value as 'starter' | 'consultant')}
        className="rounded-md border border-slate-300 px-1.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="starter">Starter</option>
        <option value="consultant">Consultant</option>
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <button
        onClick={() => submit(true)}
        disabled={isPending}
        className="rounded-md border border-emerald-500 px-2 py-1 text-xs font-medium text-emerald-700 disabled:opacity-60 dark:text-emerald-300"
      >
        Comp
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
