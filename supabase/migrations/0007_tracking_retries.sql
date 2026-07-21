-- Migration 0007 — Tracking retries / dead-letter + enqueue consolidation (Part VIII §44 Week 6)
--
-- Adds retry bookkeeping to tracking_runs and makes the enqueue idempotent against dead-lettered
-- runs. Also consolidates the scheduler: the Next.js processor now runs enqueue + execute in one
-- pass (Vercel Cron), so the standalone pg_cron enqueue job is retired to avoid a second,
-- out-of-phase enqueue source. The enqueue FUNCTION stays (called by the processor via a
-- service-role-only public wrapper).

-- Retry bookkeeping.
alter table public.tracking_runs
  add column attempts   integer not null default 0,
  add column claimed_at timestamptz;
comment on column public.tracking_runs.attempts is
  'Number of execution attempts. On failure the run retries until it reaches the max, then is dead-lettered (status=failed).';
comment on column public.tracking_runs.claimed_at is
  'When the run was claimed (status→running). Stale claims are reclaimed to pending by the processor.';

-- Enqueue now skips a prompt/engine that has ANY recent terminal run (succeeded OR failed) within
-- the interval — so a dead-lettered run isn't immediately re-created every tick.
create or replace function app.enqueue_due_tracking_runs(p_interval interval default interval '7 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  with due as (
    select p.id as prompt_id, p.project_id, e.engine
    from public.prompts p
    cross join (
      select unnest(enum_range(null::public.tracking_engine)) as engine
    ) e
    where not exists (
      select 1 from public.tracking_runs tr
      where tr.prompt_id = p.id and tr.engine = e.engine
        and tr.status in ('pending', 'running')
    )
    and not exists (
      select 1 from public.tracking_runs tr
      where tr.prompt_id = p.id and tr.engine = e.engine
        and tr.status in ('succeeded', 'failed')
        and tr.run_at > now() - p_interval
    )
  )
  insert into public.tracking_runs (project_id, prompt_id, engine, status)
  select project_id, prompt_id, engine, 'pending'
  from due;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Service-role-only public wrapper so the Next.js processor can invoke enqueue via rpc().
create or replace function public.enqueue_due_tracking_runs(p_interval interval default interval '7 days')
returns integer
language sql
security definer
set search_path = ''
as $$
  select app.enqueue_due_tracking_runs(p_interval);
$$;
revoke all on function public.enqueue_due_tracking_runs(interval) from public, anon, authenticated;
grant execute on function public.enqueue_due_tracking_runs(interval) to service_role;

-- Retire the standalone pg_cron enqueue job (the processor owns the enqueue+execute cycle now).
select cron.unschedule('plutoscope-enqueue-tracking')
where exists (select 1 from cron.job where jobname = 'plutoscope-enqueue-tracking');
