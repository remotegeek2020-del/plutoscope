import { cookies } from 'next/headers';

// Active-project (consultant "current client") selection, persisted in a cookie so it survives
// navigation. Server-only usage (reads the cookie store). Part VIII §47 Week 16.

export const ACTIVE_PROJECT_COOKIE = 'active_project';

export async function getActiveProjectId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
}

/**
 * Resolve which project is active: an explicit `?project=` param wins, then the cookie, then the
 * first (most recent) project. Pure — the caller passes the owned project list.
 */
export function resolveActiveProject<T extends { id: string }>(
  projects: T[],
  cookieId: string | null,
  paramId?: string,
): T | undefined {
  return (
    (paramId ? projects.find((p) => p.id === paramId) : undefined) ??
    (cookieId ? projects.find((p) => p.id === cookieId) : undefined) ??
    projects[0]
  );
}
