'use client';

import { useState, useTransition } from 'react';

import { runTrackingNow } from './actions';

/** Staff-only button that triggers one tracking cycle on demand (for testing). */
export function RunNow() {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            setError(null);
            const result = await runTrackingNow();
            if (result.ok) setMsg(result.summary);
            else setError(result.error);
          })
        }
        disabled={isPending}
        className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Running…' : 'Run tracking now'}
      </button>
      {msg ? <span className="text-xs text-emerald-600 dark:text-emerald-400">{msg}</span> : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
