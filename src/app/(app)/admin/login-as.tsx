'use client';

import { useState, useTransition } from 'react';

import { startImpersonation } from './actions';

export function LoginAs({ accountId }: { accountId: string }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason / ticket"
        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startImpersonation({ targetAccountId: accountId, reason });
            if (result && !result.ok) setError(result.error);
          })
        }
        disabled={isPending}
        className="rounded-md bg-instrument px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        Login as
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
