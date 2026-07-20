-- Migration 0001 — Account + Project
-- Week 1 (Part VIII §43): the first schema migration is Account and Project tables only.
-- These are the customer-facing core entities; account-level RLS isolation is the
-- multi-tenant boundary the whole app depends on (Part III §18).
--
-- A verified-staff-session RLS bypass path (Part III §18.1) is added in migration 0002 as
-- ADDITIONAL permissive policies, so it is designed from the start rather than retrofitted.

-- Private schema for helper functions and (in 0002) the staff/admin realm. Never exposed
-- via the API (PostgREST only serves `public`).
create schema if not exists app;
comment on schema app is
  'Private Plutoscope schema for helper functions and staff/admin objects not exposed via the API.';

-- Shared updated_at trigger.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enums.
create type public.account_tier as enum ('free', 'starter', 'consultant', 'agency', 'enterprise');
create type public.billing_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'
);

-- Account: one per subscriber (Part III §18).
create table public.accounts (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  name           text,
  tier           public.account_tier   not null default 'free',
  seats          integer               not null default 1 check (seats >= 1),
  billing_status public.billing_status not null default 'trialing',
  created_at     timestamptz           not null default now(),
  updated_at     timestamptz           not null default now()
);
comment on table public.accounts is
  'One per subscriber. owner_id links the customer auth user. Team seats (multi-user membership) '
  'are a Phase-2 addition, not MVP — MVP accounts have a single owner.';
create index accounts_owner_id_idx on public.accounts (owner_id);
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function app.set_updated_at();

-- Project: one tracked brand/domain (Part III §18).
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  domain     text not null,
  label      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.projects is
  'One tracked brand/domain. Per-tier caps (3 for Starter, 10 for Consultant) are enforced in '
  'application logic, not here.';
create index projects_account_id_idx on public.projects (account_id);
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function app.set_updated_at();

-- Row Level Security: account-level isolation (customer owner path).
alter table public.accounts enable row level security;
alter table public.projects enable row level security;

-- accounts: the owner can read/insert/update/delete their own account.
-- (select auth.uid()) is wrapped in a subselect so Postgres evaluates it once per statement.
create policy accounts_owner_select on public.accounts
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy accounts_owner_insert on public.accounts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy accounts_owner_update on public.accounts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy accounts_owner_delete on public.accounts
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- projects: the owner of the parent account has full access.
create policy projects_owner_all on public.projects
  for all to authenticated
  using (
    account_id in (select id from public.accounts where owner_id = (select auth.uid()))
  )
  with check (
    account_id in (select id from public.accounts where owner_id = (select auth.uid()))
  );
