'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { runAuditAction } from './actions';

interface Props {
  projects: { id: string; domain: string; label: string | null }[];
}

export function AuditForm({ projects }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [pageUrl, setPageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await runAuditAction({ projectId, pageUrl });
      if (!result.ok) {
        setError(result.error);
      } else {
        setPageUrl('');
        router.refresh();
      }
    });
  };

  if (projects.length === 0) return null;

  const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Project</span>
        <select
          className={inputClass}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label || p.domain}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium">Page URL</span>
        <input
          className={inputClass}
          placeholder="https://example.com/page"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-instrument px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Auditing…' : 'Run audit'}
      </button>
      {error ? (
        <p className="text-sm text-red-600 sm:self-center" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
