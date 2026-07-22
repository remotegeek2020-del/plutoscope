import 'server-only';

import { createClient } from '@/lib/supabase/server';

/** The signed-in user's staff role (support/engineering/super_admin), or null if not staff. */
export async function getStaffRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_staff_role');
  return (data as string | null) ?? null;
}
