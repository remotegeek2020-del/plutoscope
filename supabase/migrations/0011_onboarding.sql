-- Migration 0011 — Onboarding completion (Part VIII §48 Week 20)
-- Marks when an account finished the guided onboarding, so it isn't shown again.

alter table public.accounts add column onboarded_at timestamptz;
