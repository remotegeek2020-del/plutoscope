-- Migration 0005 — Scheduler foundation (Part VIII §43 Week 3)
--
-- The "minimal scheduler" is split into two halves so the enqueue half works and is testable
-- now (no API keys, no external calls), while the execute half is a deployed Edge Function
-- worker skeleton that gains real engine adapters in Milestone 1 (Week 4):
--
--   ENQUEUE (this migration): a SQL function that inserts `pending` tracking_runs for every
--     (prompt × engine) that is "due" (no in-flight run and no successful run within the refresh
--     interval), scheduled by pg_cron. Runs as the definer (postgres), so it bypasses RLS.
--   EXECUTE (supabase/functions/worker): claims `pending` runs and dispatches them to the engine
--     adapter for that engine. Until Week 4 the dispatch is a no-op skeleton.
--
-- raw_response storage decision (Week 3): kept as a Postgres `jsonb` column on tracking_runs
-- (see 0004). Fine for MVP volume; per Part III §17.3 this moves to object storage
-- (Supabase Storage/S3) once raw payloads bloat the primary database.

create extension if not exists pg_cron;

-- Enqueue due tracking runs. Idempotent: skips prompts that already have a pending/running run
-- for that engine, or a successful run within `p_interval` (MVP refresh cadence = weekly).
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
        and tr.status = 'succeeded'
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
comment on function app.enqueue_due_tracking_runs(interval) is
  'Inserts pending tracking_runs for every (prompt × engine) due for a refresh. Scheduled by pg_cron; the worker Edge Function processes the pending rows.';

-- Timed trigger: check hourly for due prompts. The function itself decides what is actually due
-- (weekly cadence), so frequent checks are cheap and idempotent. Re-scheduling by the same name
-- replaces any existing job, so this migration is safe to re-run.
select cron.schedule(
  'plutoscope-enqueue-tracking',
  '0 * * * *',
  $$select app.enqueue_due_tracking_runs()$$
);
