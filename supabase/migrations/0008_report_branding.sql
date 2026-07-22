-- Migration 0008 — White-label report branding (Part VIII §47 Week 17)
-- Adds per-account branding (brand name + logo) for white-label PDF reports, plus a public
-- storage bucket for logo uploads scoped to the owning account.

alter table public.accounts
  add column report_brand_name text,
  add column report_logo_url text;

-- Public bucket for report logos (served via public URL on the branded PDF).
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Anyone can read a logo (public bucket / white-label reports may be shared).
create policy "branding public read"
  on storage.objects for select
  using (bucket_id = 'branding');

-- An account owner can write only under their own account-id folder (name = "<account_id>/...").
create policy "branding owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] in (
      select id::text from public.accounts where owner_id = (select auth.uid())
    )
  );

create policy "branding owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] in (
      select id::text from public.accounts where owner_id = (select auth.uid())
    )
  );
