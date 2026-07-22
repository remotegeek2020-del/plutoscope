-- Migration 0009 — Stripe billing linkage (Part VIII §48 Week 19)
-- Links an Account to its Stripe customer + subscription so webhooks can reconcile tier and
-- billing_status. Stripe is the founder-approved processor. Values are set server-side only.

alter table public.accounts
  add column stripe_customer_id     text unique,
  add column stripe_subscription_id text;
