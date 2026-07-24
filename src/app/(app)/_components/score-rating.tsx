// Turns a 0–100 score into a plain-language rating so a bare number ("54") reads as good/bad.
// Shared so every screen labels scores the same way.

export interface Rating {
  label: string;
  tone: string;
}

export function scoreRating(value: number | null | undefined): Rating {
  if (value == null) return { label: 'n/a', tone: 'bg-slate-100 text-slate-500 dark:bg-slate-800' };
  if (value >= 85) return { label: 'Excellent', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
  if (value >= 70) return { label: 'Good', tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' };
  if (value >= 50) return { label: 'Fair', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
  return { label: 'Poor', tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' };
}

/** Badge showing the qualitative rating for a score. */
export function ScoreRatingBadge({ value }: { value: number | null | undefined }) {
  const { label, tone } = scoreRating(value);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
  );
}

/** One-line legend of the rating bands. */
export function ScoreRatingLegend() {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Scores run <strong>0–100</strong>. Bands:{' '}
      <span className="text-red-600 dark:text-red-400">0–49 Poor</span> ·{' '}
      <span className="text-amber-600 dark:text-amber-400">50–69 Fair</span> ·{' '}
      <span className="text-teal-600 dark:text-teal-400">70–84 Good</span> ·{' '}
      <span className="text-emerald-600 dark:text-emerald-400">85–100 Excellent</span>.
    </p>
  );
}
