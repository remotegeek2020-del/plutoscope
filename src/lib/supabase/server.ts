import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { clientEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions. Reads/writes the
 * auth session from cookies. RLS applies with the caller's session (anon key), so account
 * isolation from migrations 0001–0002 is enforced for every query made through this client.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where cookies are read-only.
            // Safe to ignore — the middleware (updateSession) refreshes the session cookie.
          }
        },
      },
    },
  );
}
