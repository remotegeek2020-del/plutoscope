'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { setActiveProject } from '../actions';

interface Client {
  id: string;
  domain: string;
  label: string | null;
}

export function ClientList({ clients, activeId }: { clients: Client[]; activeId: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.domain.toLowerCase().includes(q) || (c.label ?? '').toLowerCase().includes(q),
    );
  }, [clients, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search clients…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />

      <ul className="mt-4 flex flex-col gap-2">
        {filtered.map((client) => {
          const isActive = client.id === activeId;
          return (
            <li
              key={client.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                isActive
                  ? 'border-instrument dark:border-pluto'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {client.label || client.domain}
                  {isActive ? (
                    <span className="rounded-full bg-instrument px-2 py-0.5 text-[10px] font-medium uppercase text-white dark:bg-pluto dark:text-slate-900">
                      active
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-400">{client.domain}</div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-slate-500 hover:underline">
                  Dashboard
                </Link>
                <Link
                  href={`/competitive?project=${client.id}`}
                  className="text-slate-500 hover:underline"
                >
                  Competitive
                </Link>
                <Link
                  href={`/briefs?project=${client.id}`}
                  className="text-slate-500 hover:underline"
                >
                  Briefs
                </Link>
                <a
                  href={`/api/reports/${client.id}`}
                  target="_blank"
                  rel="noopener"
                  className="text-slate-500 hover:underline"
                >
                  Export PDF
                </a>
                {isActive ? null : (
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await setActiveProject(client.id);
                        router.refresh();
                      })
                    }
                    disabled={isPending}
                    className="rounded-md bg-instrument px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
                  >
                    Set active
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No clients match “{query}”.
        </p>
      ) : null}
    </div>
  );
}
