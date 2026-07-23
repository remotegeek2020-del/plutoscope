'use client';

import { useState, useTransition } from 'react';

import { addCompetitor, removeCompetitor } from './actions';

type Competitor = { id: string; domain: string };

/**
 * Add/remove competitors on a project without recreating it, plus one-click "suggested" chips
 * derived from the domains the AI actually cites for this project's prompts (auto-discovered
 * competitors). Enforces the per-tier cap via the server action.
 */
export function ManageCompetitors({
  projectId,
  competitors,
  suggestions,
  maxCompetitors,
}: {
  projectId: string;
  competitors: Competitor[];
  suggestions: string[];
  maxCompetitors: number;
}) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const atCap = competitors.length >= maxCompetitors;

  const add = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setError(null);
    startTransition(async () => {
      const result = await addCompetitor(projectId, v);
      if (!result.ok) setError(result.error);
      else setDomain('');
    });
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeCompetitor(id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Competitors</h2>
        <span className="text-xs text-slate-400">
          {competitors.length}/{maxCompetitors}
        </span>
      </div>

      {competitors.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {competitors.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800"
            >
              {c.domain}
              <button
                onClick={() => remove(c.id)}
                disabled={isPending}
                className="text-slate-400 hover:text-red-600 disabled:opacity-60"
                aria-label={`Remove ${c.domain}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          No competitors pinned yet. Add one below, or pick a suggestion.
        </p>
      )}

      {!atCap ? (
        <div className="mt-3 flex gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(domain);
              }
            }}
            placeholder="competitor.com"
            className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            onClick={() => add(domain)}
            disabled={isPending || !domain.trim()}
            className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Add
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          At your plan limit of {maxCompetitors}. Remove one to add another.
        </p>
      )}

      {!atCap && suggestions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Suggested from your tracking data — domains the AI cites most for your prompts:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => add(s)}
                disabled={isPending}
                className="rounded-full border border-instrument/40 px-2.5 py-1 text-xs font-medium text-instrument hover:bg-instrument/5 disabled:opacity-60 dark:border-pluto/40 dark:text-pluto"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
