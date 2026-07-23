import type { ReactNode } from 'react';

/**
 * Plain-language explainer panel. The data screens use technical shorthand (GEO/AEO, "1/3", "gap")
 * that is meaningless without context — this renders an unmissable "how to read this" box so the
 * screen explains itself instead of relying on a person already knowing the jargon.
 */
export function HelpNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
      <summary className="cursor-pointer select-none font-medium text-instrument dark:text-pluto">
        {title}
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-slate-600 dark:text-slate-300">{children}</div>
    </details>
  );
}
