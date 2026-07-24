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

function CopyBlock({ label, hint, code }: { label: string; hint: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <details className="mt-3 rounded-md border border-slate-200 dark:border-slate-800">
      <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-xs font-medium">
        <span>{label}</span>
        <button
          onClick={(e) => {
            e.preventDefault();
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="rounded-md bg-instrument px-2.5 py-1 text-xs font-medium text-white"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </summary>
      <div className="px-3 pb-3">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        <pre className="max-h-64 overflow-auto rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed dark:bg-slate-900">
          <code>{code}</code>
        </pre>
      </div>
    </details>
  );
}

export function BriefEditor({
  brief,
}: {
  brief: {
    id: string;
    draft_content: string | null;
    page_html: string | null;
    faq_schema: string | null;
    status: string;
  };
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

      {brief.page_html || brief.faq_schema ? (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="text-xs font-semibold">Easy mode — paste these into your site:</p>
          {brief.page_html ? (
            <CopyBlock
              label="1. Page HTML"
              hint="Paste this into a new page in your CMS (WordPress, Webflow, etc.) and publish. It's the actual page content the AI will read."
              code={brief.page_html}
            />
          ) : null}
          {brief.faq_schema ? (
            <CopyBlock
              label="2. FAQ schema (structured data)"
              hint="Paste this into the same page's HTML head. It tells AI engines and Google that the page answers these questions — it describes your real content, it doesn't replace it."
              code={brief.faq_schema}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
