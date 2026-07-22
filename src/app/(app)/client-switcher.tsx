'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { setActiveProject } from './actions';

export function ClientSwitcher({
  projects,
  activeId,
}: {
  projects: { id: string; domain: string; label: string | null }[];
  activeId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (projects.length === 0) return null;

  return (
    <select
      aria-label="Active client"
      value={activeId}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await setActiveProject(e.target.value);
          router.refresh();
        })
      }
      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label || p.domain}
        </option>
      ))}
    </select>
  );
}
