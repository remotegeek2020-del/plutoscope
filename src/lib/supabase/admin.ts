import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { clientEnv, getServerEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Service-role Supabase client. BYPASSES Row Level Security — server-side use only, never
 * expose the key or this client to the browser (enforced by the `server-only` import above).
 *
 * This is the mechanism behind the staff "login as" flow (Part III §18.1): the admin console
 * verifies the StaffUser, writes an ImpersonationSession audit row, and mints a scoped,
 * time-limited session for the target account server-side — all with this client. The
 * customer's real credentials are never known or reset.
 *
 * Guardrails for callers:
 *  - Only instantiate inside trusted server code (Route Handlers / Server Actions).
 *  - Every impersonation action MUST write/inspect an app.impersonation_sessions row.
 *  - Default to read-only; elevated writes are a separate, separately-logged path.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
