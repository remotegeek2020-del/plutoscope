-- Migration 0006 — One account per owner (Part VIII §44 Week 5)
-- MVP accounts have a single owner (team seats are Phase 2). Enforce exactly one Account per
-- auth user so account-creation is race-safe and lookups are unambiguous. The unique constraint
-- supersedes the non-unique owner index from 0001.

drop index if exists public.accounts_owner_id_idx;
alter table public.accounts add constraint accounts_owner_id_key unique (owner_id);
