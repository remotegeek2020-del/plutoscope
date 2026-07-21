// Retry/dead-letter policy for tracking runs (Part VIII §44 Week 6). Pure and unit-tested; the
// processor imports these so the decision logic is testable without hitting the database.

/** Total execution attempts allowed before a run is dead-lettered (status=failed). */
export const MAX_ATTEMPTS = 3;

/** A run left `running` longer than this is assumed crashed and is reclaimed to `pending`. */
export const STALE_RUNNING_MS = 10 * 60 * 1000;

/** Whether a run that just failed on `attempt` should be retried (vs. dead-lettered). */
export function shouldRetry(attempt: number, maxAttempts: number = MAX_ATTEMPTS): boolean {
  return attempt < maxAttempts;
}
