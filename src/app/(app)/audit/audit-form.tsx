'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { runAuditAction, scanSiteAction } from './actions';

interface Props {
  projects: { id: string; domain: string; label: string | null }[];
}

export function AuditForm({ projects }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [pageUrl, setPageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isScanning, startScan] = useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
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

  const onScan = () => {
    setError(null);
    setNotice(null);
    startScan(async () => {
      const result = await scanSiteAction({ projectId });
      if (!result.ok) {
        setError(result.error);
      } else {
        setNotice(
          `Scanned your site: ${result.audited} page(s) audited` +
            (result.failed ? `, ${result.failed} couldn’t be read` : '') +
            (result.discovered > result.limit
              ? `. Found ${result.discovered} pages; audited the first ${result.limit} (your plan limit).`
              : '.'),
        );
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
        disabled={isPending || isScanning}
        className="rounded-md bg-instrument px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Auditing…' : 'Audit this page'}
      </button>
      <button
        type="button"
        onClick={onScan}
        disabled={isPending || isScanning}
        className="rounded-md border border-instrument px-4 py-2 text-sm font-medium text-instrument disabled:opacity-60 dark:border-pluto dark:text-pluto"
        title="Finds your pages and audits them automatically"
      >
        {isScanning ? 'Scanning your site…' : 'Scan whole site'}
      </button>
      {error ? (
        <p className="text-sm text-red-600 sm:self-center" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-emerald-600 sm:self-center dark:text-emerald-400">{notice}</p>
      ) : null}
    </form>
  );
}
