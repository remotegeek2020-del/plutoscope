-- Migration 0002 — Staff realm + verified-staff-session RLS bypass
-- Week 1 (Part VIII §43) + Part III §18.1.
--
-- Plutoscope is a single-vendor SaaS: internal staff must be able to access any customer
-- account for support, WITHOUT a customer's password. This migration lays the foundation:
--   1. A StaffUser realm that is SEPARATE from customer Account records (private `app`
--      schema, never exposed via the API), so a support/eng bypass can never be confused
--      with or granted to a customer login.
--   2. An ImpersonationSession audit table — one row per staff access (who / which account /
--      when / why), auto-expiring, read-only by default.
--   3. A SECURITY DEFINER function used as the verified-staff-session bypass PATH inside RLS,
--      added as ADDITIONAL permissive policies on the customer tables from 0001 (RLS OR's
--      permissive policies, so this augments the owner path without modifying it).
--
-- Designing this now — not after the fact — is a deliberate §18.1 requirement.

create type app.staff_role as enum ('support', 'engineering', 'super_admin');
create type app.impersonation_mode as enum ('read_only', 'elevated');

-- StaffUser (Part III §18): internal Plutoscope team accounts. References auth.users but is
-- isolated in the private `app` schema. Being present in auth.users does NOT imply staff.
create table app.staff_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  email      text not null unique,
  role       app.staff_role not null default 'support',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table app.staff_users is
  'Internal Plutoscope staff — a separate auth realm from customer accounts (Part III §18.1). '
  'Not exposed via the API; managed server-side with the service-role key.';
create trigger staff_users_set_updated_at
  before update on app.staff_users
  for each row execute function app.set_updated_at();

-- ImpersonationSession (Part III §18): audit-logged record of every staff account access.
create table app.impersonation_sessions (
  id                uuid primary key default gen_random_uuid(),
  staff_user_id     uuid not null references app.staff_users (id) on delete restrict,
  target_account_id uuid not null references public.accounts (id) on delete cascade,
  reason            text not null,
  access_mode       app.impersonation_mode not null default 'read_only',
  started_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '30 minutes'),
  ended_at          timestamptz
);
comment on table app.impersonation_sessions is
  'Audit trail of staff access: who, which account, when, and why (reason/ticket). Auto-expires '
  '(default 30 min). Read-only by default; elevated writes are a separate, separately-logged '
  'path built with the admin console (Milestone 5). This is the audit trail, not optional logging.';
create index impersonation_sessions_active_idx
  on app.impersonation_sessions (id) where ended_at is null;
create index impersonation_sessions_account_idx
  on app.impersonation_sessions (target_account_id);
create index impersonation_sessions_staff_idx
  on app.impersonation_sessions (staff_user_id);

-- Reads the impersonation session id carried as a custom JWT claim on the scoped session that
-- the admin console mints server-side (with the service-role key) after verifying the staff
-- user. Guarded so an unset/empty claim yields NULL rather than erroring.
create or replace function app.current_impersonation_session_id()
returns uuid
language sql
stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'impersonation_session_id',
    ''
  )::uuid;
$$;

-- The verified-staff-session bypass path. SECURITY DEFINER so it can read the private `app`
-- schema during RLS evaluation. Re-validates the claimed session against the table, so an
-- expired or ended session is never honored even if the JWT claim is still present.
create or replace function app.active_impersonation_account()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.target_account_id
  from app.impersonation_sessions s
  where s.id = app.current_impersonation_session_id()
    and s.ended_at is null
    and s.expires_at > now()
  limit 1;
$$;
comment on function app.active_impersonation_account() is
  'Returns the account id a verified, unexpired staff impersonation session currently targets, '
  'else NULL. Used as the staff-bypass path in RLS (Part III §18.1).';

grant usage on schema app to authenticated, anon;
grant execute on function app.current_impersonation_session_id() to authenticated, anon;
grant execute on function app.active_impersonation_account() to authenticated, anon;

-- Verified-staff-session bypass: ADDITIONAL permissive, READ-ONLY policies on the customer
-- tables. Writes during impersonation are intentionally excluded — elevated write mode is a
-- separate, separately-logged path built with the admin console (Milestone 5 / Week 19).
create policy accounts_staff_impersonation_select on public.accounts
  for select to authenticated
  using (id = app.active_impersonation_account());

create policy projects_staff_impersonation_select on public.projects
  for select to authenticated
  using (account_id = app.active_impersonation_account());

-- Staff-realm tables carry RLS with no API-role policies, and all grants are revoked from the
-- API roles: customers can never reach staff data. Staff reads/writes happen server-side via
-- the service-role key (which bypasses RLS).
alter table app.staff_users enable row level security;
alter table app.impersonation_sessions enable row level security;
revoke all on app.staff_users from authenticated, anon;
revoke all on app.impersonation_sessions from authenticated, anon;
