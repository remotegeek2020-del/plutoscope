// Labeled 0–100 bar for a discipline sub-score (GEO / AEO / SEO). `null` renders as "n/a"
// (SEO is null until the rank-tracking vendor is wired).
export function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-medium">{value === null ? 'n/a' : Math.round(value)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-instrument dark:bg-pluto"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
