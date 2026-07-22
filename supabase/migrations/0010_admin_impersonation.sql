-- Migration 0010 — Admin/impersonation console RPCs (Part VIII §48 Week 19; Part III §18.1)
--
-- The `app` staff schema stays PRIVATE (not exposed to the API). These SECURITY DEFINER functions
-- are the only controlled surface: each verifies the caller is an active staff user. Impersonation
-- is audited (app.impersonation_sessions), read-only, and time-limited (30 min). Per founder
-- decision, impersonation is DISCLOSED to customers via public.account_access_log().

create or replace function app.current_staff_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from app.staff_users where user_id = (select auth.uid()) and is_active limit 1;
$$;

create or replace function public.admin_staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select role::text from app.staff_users where user_id = (select auth.uid()) and is_active limit 1;
$$;
grant execute on function public.admin_staff_role() to authenticated;

create or replace function public.admin_search_accounts(p_query text)
returns table (id uuid, name text, tier text, billing_status text, owner_email text, projects bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_staff_id() is null then raise exception 'not authorized'; end if;
  return query
    select a.id, a.name, a.tier::text, a.billing_status::text, u.email::text,
           (select count(*) from public.projects p where p.account_id = a.id)
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

create or replace function public.admin_start_impersonation(p_target uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_staff uuid; v_id uuid;
begin
  v_staff := app.current_staff_id();
  if v_staff is null then raise exception 'not authorized'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'reason required'; end if;
  if not exists (select 1 from public.accounts where id = p_target) then raise exception 'account not found'; end if;
  insert into app.impersonation_sessions (staff_user_id, target_account_id, reason, access_mode, expires_at)
  values (v_staff, p_target, trim(p_reason), 'read_only', now() + interval '30 minutes')
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.admin_start_impersonation(uuid, text) to authenticated;

create or replace function public.admin_end_impersonation(p_session uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_staff uuid;
begin
  v_staff := app.current_staff_id();
  if v_staff is null then raise exception 'not authorized'; end if;
  update app.impersonation_sessions set ended_at = now()
   where id = p_session and staff_user_id = v_staff and ended_at is null;
end;
$$;
grant execute on function public.admin_end_impersonation(uuid) to authenticated;

create or replace function public.admin_active_impersonation(p_session uuid)
returns table (account_id uuid, account_name text, account_domain text, expires_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_staff uuid;
begin
  v_staff := app.current_staff_id();
  if v_staff is null then return; end if;
  return query
    select a.id, a.name,
           (select p.domain from public.projects p where p.account_id = a.id order by p.created_at limit 1),
           s.expires_at
    from app.impersonation_sessions s
    join public.accounts a on a.id = s.target_account_id
    where s.id = p_session and s.staff_user_id = v_staff and s.ended_at is null and s.expires_at > now();
end;
$$;
grant execute on function public.admin_active_impersonation(uuid) to authenticated;

create or replace function public.admin_account_detail(p_session uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_staff uuid; v_account uuid;
begin
  v_staff := app.current_staff_id();
  if v_staff is null then raise exception 'not authorized'; end if;
  select target_account_id into v_account from app.impersonation_sessions
   where id = p_session and staff_user_id = v_staff and ended_at is null and expires_at > now();
  if v_account is null then raise exception 'no active session'; end if;
  return (
    select json_build_object(
      'account', (select json_build_object('id', a.id, 'name', a.name, 'tier', a.tier, 'billing_status', a.billing_status)
                    from public.accounts a where a.id = v_account),
      'projects', coalesce((
        select json_agg(json_build_object(
          'id', p.id, 'domain', p.domain, 'label', p.label,
          'blended', (select vs.blended_index from public.visibility_scores vs where vs.project_id = p.id order by vs.date desc limit 1)
        ) order by p.created_at desc)
        from public.projects p where p.account_id = v_account
      ), '[]'::json)
    )
  );
end;
$$;
grant execute on function public.admin_account_detail(uuid) to authenticated;

create or replace function public.admin_audit_log()
returns table (id uuid, staff_email text, account_name text, reason text, access_mode text,
               started_at timestamptz, ended_at timestamptz, expires_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_staff_id() is null then raise exception 'not authorized'; end if;
  return query
    select s.id, su.email::text, a.name, s.reason, s.access_mode::text, s.started_at, s.ended_at, s.expires_at
    from app.impersonation_sessions s
    join app.staff_users su on su.id = s.staff_user_id
    join public.accounts a on a.id = s.target_account_id
    order by s.started_at desc limit 100;
end;
$$;
grant execute on function public.admin_audit_log() to authenticated;

-- Customer-facing disclosure: the caller's own account access log (who accessed, when, why).
create or replace function public.account_access_log()
returns table (started_at timestamptz, ended_at timestamptz, reason text, staff_email text, access_mode text)
language sql stable security definer set search_path = '' as $$
  select s.started_at, s.ended_at, s.reason, su.email::text, s.access_mode::text
  from app.impersonation_sessions s
  join app.staff_users su on su.id = s.staff_user_id
  join public.accounts a on a.id = s.target_account_id
  where a.owner_id = (select auth.uid())
  order by s.started_at desc limit 100;
$$;
revoke all on function public.account_access_log() from anon;
grant execute on function public.account_access_log() to authenticated;
