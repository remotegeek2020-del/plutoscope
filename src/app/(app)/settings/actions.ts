'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  brandName: z.string().max(120).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export type SaveBrandingResult = { ok: false; error: string } | { ok: true };

export async function saveBranding(input: unknown): Promise<SaveBrandingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const account = await ensureAccount();
  const supabase = await createClient();
  const { error } = await supabase
    .from('accounts')
    .update({
      report_brand_name: parsed.data.brandName?.trim() || null,
      report_logo_url: parsed.data.logoUrl?.trim() || null,
    })
    .eq('id', account.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}
