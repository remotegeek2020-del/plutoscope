-- Migration 0012 — Complimentary (comped) accounts (admin-controlled, no Stripe)
--
-- A complimentary account gets a paid tier's access WITHOUT a Stripe subscription — for beta
-- users, internal test accounts, partners, and support goodwill. It is a super-admin toggle in
-- the admin console (Part III §18.1 staff realm), not a customer-facing self-serve option.
--
-- Design notes:
--   * `is_complimentary` is the marker; `tier` still drives the per-tier caps (src/lib/tiers.ts),
--     so a comp account behaves exactly like a paying one at that tier.
--   * These accounts have no `stripe_subscription_id`, so the Stripe webhook never touches them.
--   * Turning comp OFF only force-downgrades accounts that are NOT real Stripe subscribers, so an
--     account that later started paying is never clobbered.

alter table public.accounts
  add column if not exists is_complimentary boolean not null default false,
  add column if not exists comp_reason text;

comment on column public.accounts.is_complimentary is
  'Admin-granted paid access with no Stripe subscription. Set via admin_set_complimentary().';

-- Super-admin/staff RPC: grant or revoke complimentary access for an account.
create or replace function public.admin_set_complimentary(
  p_account uuid,
  p_complimentary boolean,
  p_tier text,
  p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid;
  v_tier public.account_tier;
begin
  v_staff := app.current_staff_id();
  if v_staff is null then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.accounts where id = p_account) then
    raise exception 'account not found';
  end if;

  if p_complimentary then
    v_tier := coalesce(nullif(trim(coalesce(p_tier, '')), ''), 'consultant')::public.account_tier;
    update public.accounts
       set is_complimentary = true,
           comp_reason = nullif(trim(coalesce(p_reason, '')), ''),
           tier = v_tier,
           billing_status = 'active',
           updated_at = now()
     where id = p_account;
  else
    -- Revoking comp: drop to free only if this isn't a genuine Stripe subscriber.
    update public.accounts
       set is_complimentary = false,
           comp_reason = null,
           tier = case when stripe_subscription_id is null then 'free' else tier end,
           billing_status = case when stripe_subscription_id is null then 'canceled' else billing_status end,
           updated_at = now()
     where id = p_account;
  end if;
end;
$$;
grant execute on function public.admin_set_complimentary(uuid, boolean, text, text) to authenticated;

-- Surface comp status in the admin account search. (Drop first: the return signature changes,
-- which create-or-replace cannot do.)
drop function if exists public.admin_search_accounts(text);
create or replace function public.admin_search_accounts(p_query text)
returns table (id uuid, name text, tier text, billing_status text, owner_email text,
               projects bigint, is_complimentary boolean, comp_reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_staff_id() is null then raise exception 'not authorized'; end if;
  return query
    select a.id, a.name, a.tier::text, a.billing_status::text, u.email::text,
           (select count(*) from public.projects p where p.account_id = a.id),
           a.is_complimentary, a.comp_reason
    from public.accounts a
    join auth.users u on u.id = a.owner_id
    where p_query is null or p_query = ''
       or u.email ilike '%' || p_query || '%'
       or coalesce(a.name, '') ilike '%' || p_query || '%'
    order by a.created_at desc
    limit 50;
end;
$$;
grant execute on function public.admin_search_accounts(text) to authenticated;
