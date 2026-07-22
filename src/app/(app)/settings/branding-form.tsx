'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { createClient } from '@/lib/supabase/client';

import { saveBranding } from './actions';

interface Props {
  accountId: string;
  initialBrandName: string | null;
  initialLogoUrl: string | null;
}

export function BrandingForm({ accountId, initialBrandName, initialLogoUrl }: Props) {
  const router = useRouter();
  const [brandName, setBrandName] = useState(initialBrandName ?? '');
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'png';
      const path = `${accountId}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from('branding').getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      setSaved(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveBranding({ brandName, logoUrl });
      if (!result.ok) setError(result.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-6 max-w-md">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Brand name (on white-label reports)</span>
        <input
          value={brandName}
          onChange={(e) => {
            setBrandName(e.target.value);
            setSaved(false);
          }}
          placeholder="Acme Agency"
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      <div className="mt-4 text-sm">
        <span className="font-medium">Logo</span>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain" />
        ) : null}
        <input
          type="file"
          accept="image/*"
          onChange={onLogoChange}
          disabled={uploading}
          className="mt-2 block text-sm"
        />
        {uploading ? <p className="mt-1 text-xs text-slate-400">Uploading…</p> : null}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={isPending || uploading}
          className="rounded-md bg-instrument px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save branding'}
        </button>
        {saved ? <span className="text-xs text-emerald-600">Saved.</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
