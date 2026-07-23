'use client';

import { useState, useTransition } from 'react';

import { deleteProject } from './actions';

type ProjectItem = { id: string; domain: string; label: string | null };

/**
 * Lists the account's existing projects with a confirming delete button. Deleting removes the
 * project and all of its tracking data (cascade), so we require an explicit typed confirmation.
 */
export function ProjectList({ projects }: { projects: ProjectItem[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (projects.length === 0) return null;

  const remove = (p: ProjectItem) => {
    const name = p.label || p.domain;
    if (!window.confirm(`Delete "${name}" and all of its tracking data? This can't be undone.`)) {
      return;
    }
    setError(null);
    setPendingId(p.id);
    startTransition(async () => {
      const result = await deleteProject(p.id);
      if (result && !result.ok) setError(result.error);
      setPendingId(null);
    });
  };

  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold">Your projects</h2>
      <ul className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-900">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <div className="text-sm font-medium">{p.label || p.domain}</div>
              <div className="text-xs text-slate-400">{p.domain}</div>
            </div>
            <button
              onClick={() => remove(p)}
              disabled={pendingId === p.id}
              className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 disabled:opacity-60 dark:border-red-900 dark:text-red-400"
            >
              {pendingId === p.id ? 'Deleting…' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
