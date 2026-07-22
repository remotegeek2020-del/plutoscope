'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { generateBrief, saveBrief, setBriefStatus } from './actions';

export function GenerateBriefButton({
  projectId,
  topicId,
}: {
  projectId: string;
  topicId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await generateBrief({ projectId, topicId });
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
        disabled={isPending}
        className="rounded-md border border-instrument px-2.5 py-1 text-xs font-medium text-instrument disabled:opacity-60 dark:border-pluto dark:text-pluto"
      >
        {isPending ? 'Generating…' : 'Generate brief'}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

export function BriefEditor({
  brief,
}: {
  brief: { id: string; draft_content: string | null; status: string };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(brief.draft_content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result = await fn();
      if (!result.ok) setError(result.error ?? 'Something went wrong.');
      else {
        setSaved(true);
        router.refresh();
      }
    });

  return (
    <div className="mt-3">
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        rows={10}
        className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => run(() => saveBrief({ briefId: brief.id, draftContent: draft }))}
          disabled={isPending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60 dark:border-slate-700"
        >
          Save
        </button>
        {brief.status !== 'approved' ? (
          <button
            onClick={() => run(() => setBriefStatus({ briefId: brief.id, status: 'approved' }))}
            disabled={isPending}
            className="rounded-md bg-instrument px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Approve
          </button>
        ) : (
          <button
            onClick={() => run(() => setBriefStatus({ briefId: brief.id, status: 'draft' }))}
            disabled={isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60 dark:border-slate-700"
          >
            Reopen
          </button>
        )}
        {saved ? <span className="text-xs text-emerald-600">Saved.</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
