// The three visibility disciplines Plutoscope scores. Reused across screens so "SEO / AEO / GEO"
// means the same concrete thing everywhere and users can see which one a given screen or fix moves.

const DISCIPLINES = [
  {
    key: 'SEO',
    name: 'Search Engine Optimization',
    what: 'Ranking in classic Google/Bing results — the blue links.',
    helped: 'Clear title & meta description, real headings, internal links, page quality.',
    tag: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  {
    key: 'AEO',
    name: 'Answer Engine Optimization',
    what: 'Being the direct answer — featured snippets, “People also ask”, voice assistants.',
    helped: 'A direct answer up top, FAQ sections, concise and clear writing.',
    tag: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  {
    key: 'GEO',
    name: 'Generative Engine Optimization',
    what: 'Being cited by generative AI — ChatGPT, Perplexity, Gemini.',
    helped: 'Structured data, credible facts & named entities, fresh content.',
    tag: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
] as const;

export function DisciplineGlossary() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {DISCIPLINES.map((d) => (
        <div key={d.key} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.tag}`}>
            {d.key}
          </span>
          <div className="mt-1.5 text-xs font-medium">{d.name}</div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{d.what}</p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Helped by:</span> {d.helped}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Small inline badge for tagging an item with the discipline it affects. */
export function DisciplineBadge({ discipline }: { discipline: 'seo' | 'aeo' | 'geo' }) {
  const styles: Record<string, string> = {
    seo: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    aeo: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    geo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  };
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${styles[discipline]}`}
    >
      {discipline}
    </span>
  );
}
