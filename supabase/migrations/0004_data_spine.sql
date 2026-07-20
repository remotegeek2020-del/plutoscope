-- Migration 0004 — Full data spine (Part VIII §43 Week 2, Part III §18)
-- Adds the remaining core entities: Competitor, Topic, Prompt, TrackingRun, Citation,
-- VisibilityScore, AuditReport, ContentBrief. Every table is RLS-scoped to Account/Project
-- ownership, with the same verified-staff-session read-only bypass path (§18.1) as 0002.
--
-- Design notes vs. the §18 entity list:
--  * "Topic/Prompt" is normalized into two tables: `topics` (the user-entered topic) and
--    `prompts` (its expanded prompt set). TrackingRun.prompt_id references `prompts.id`, which
--    the §18 TrackingRun schema requires. A topic's `expanded_prompt_set` = its `prompts` rows.
--  * `project_id` is denormalized onto `prompts`, `tracking_runs`, and `citations` so RLS and
--    competitive queries stay simple and fast (one predicate, no deep joins per row).

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
create type public.tracking_engine as enum ('openai', 'perplexity', 'gemini');
create type public.tracking_run_status as enum ('pending', 'running', 'succeeded', 'failed');
create type public.content_brief_status as enum ('draft', 'approved', 'archived');

-- ---------------------------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER so they can evaluate ownership past RLS)
-- ---------------------------------------------------------------------------------------------
create or replace function app.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.accounts a on a.id = p.account_id
    where p.id = p_project_id
      and a.owner_id = (select auth.uid())
  );
$$;
comment on function app.owns_project(uuid) is
  'True if the current user owns the account that owns the given project. Owner path for child-table RLS.';

create or replace function app.project_in_impersonated_account(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.account_id = app.active_impersonation_account()
  );
$$;
comment on function app.project_in_impersonated_account(uuid) is
  'True if the given project belongs to the account a verified staff impersonation session targets (§18.1).';

grant execute on function app.owns_project(uuid) to authenticated, anon;
grant execute on function app.project_in_impersonated_account(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

-- Competitor (Part III §18) — up to 3 per project in MVP (enforced in app logic).
create table public.competitors (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  domain     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index competitors_project_id_idx on public.competitors (project_id);
create trigger competitors_set_updated_at before update on public.competitors
  for each row execute function app.set_updated_at();

-- Topic (Part III §18) — user-entered topic that expands into a set of prompts.
create table public.topics (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index topics_project_id_idx on public.topics (project_id);
create trigger topics_set_updated_at before update on public.topics
  for each row execute function app.set_updated_at();

-- Prompt — the expanded prompt set for a topic. TrackingRun references these.
create table public.prompts (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.topics (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prompts_topic_id_idx on public.prompts (topic_id);
create index prompts_project_id_idx on public.prompts (project_id);
create trigger prompts_set_updated_at before update on public.prompts
  for each row execute function app.set_updated_at();

-- TrackingRun (Part III §18) — one row per (prompt × engine × schedule tick). Stores the raw
-- API response for auditability. raw_response is jsonb for MVP volume; archive to object
-- storage per §17.3 once it bloats.
create table public.tracking_runs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  prompt_id    uuid not null references public.prompts (id) on delete cascade,
  engine       public.tracking_engine not null,
  status       public.tracking_run_status not null default 'pending',
  run_at       timestamptz,
  raw_response jsonb,
  error        text,
  created_at   timestamptz not null default now()
);
create index tracking_runs_project_id_idx on public.tracking_runs (project_id);
create index tracking_runs_prompt_engine_idx on public.tracking_runs (prompt_id, engine, run_at desc);

-- Citation (Part III §18) — normalized extraction from a TrackingRun's raw_response, one row
-- per cited source. project_id is denormalized for RLS + competitive gap queries.
create table public.citations (
  id              uuid primary key default gen_random_uuid(),
  tracking_run_id uuid not null references public.tracking_runs (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  cited_domain    text not null,
  source_url      text,
  position        integer,
  snippet         text,
  created_at      timestamptz not null default now()
);
create index citations_tracking_run_id_idx on public.citations (tracking_run_id);
create index citations_project_domain_idx on public.citations (project_id, cited_domain);

-- VisibilityScore (Part III §18) — computed rollup per project per period; feeds the dashboard.
create table public.visibility_scores (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  date          date not null,
  seo_score     numeric(6, 2),
  aeo_score     numeric(6, 2),
  geo_score     numeric(6, 2),
  blended_index numeric(6, 2),
  created_at    timestamptz not null default now(),
  unique (project_id, date)
);
create index visibility_scores_project_date_idx on public.visibility_scores (project_id, date desc);

-- AuditReport (Part III §18) — generated per audited page.
create table public.audit_reports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  page_url        text not null,
  overall_score   numeric(6, 2),
  seo_findings    jsonb not null default '[]'::jsonb,
  aeo_findings    jsonb not null default '[]'::jsonb,
  geo_findings    jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index audit_reports_project_id_idx on public.audit_reports (project_id);
create trigger audit_reports_set_updated_at before update on public.audit_reports
  for each row execute function app.set_updated_at();

-- ContentBrief (Part III §18) — generated from citation gaps; draft is human-reviewed.
create table public.content_briefs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  topic_id      uuid references public.topics (id) on delete set null,
  gap_summary   text,
  draft_content text,
  status        public.content_brief_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index content_briefs_project_id_idx on public.content_briefs (project_id);
create trigger content_briefs_set_updated_at before update on public.content_briefs
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Row Level Security — owner (full access) + verified-staff-session (read-only) per §18.1.
-- ---------------------------------------------------------------------------------------------
alter table public.competitors       enable row level security;
alter table public.topics            enable row level security;
alter table public.prompts           enable row level security;
alter table public.tracking_runs     enable row level security;
alter table public.citations         enable row level security;
alter table public.visibility_scores enable row level security;
alter table public.audit_reports     enable row level security;
alter table public.content_briefs    enable row level security;

-- Owner: full access where the caller owns the parent project.
create policy competitors_owner_all on public.competitors
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy topics_owner_all on public.topics
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy prompts_owner_all on public.prompts
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy tracking_runs_owner_all on public.tracking_runs
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy citations_owner_all on public.citations
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy visibility_scores_owner_all on public.visibility_scores
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy audit_reports_owner_all on public.audit_reports
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));
create policy content_briefs_owner_all on public.content_briefs
  for all to authenticated
  using (app.owns_project(project_id)) with check (app.owns_project(project_id));

-- Verified-staff-session bypass: additional read-only (SELECT) policies for impersonation.
create policy competitors_staff_select on public.competitors
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy topics_staff_select on public.topics
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy prompts_staff_select on public.prompts
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy tracking_runs_staff_select on public.tracking_runs
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy citations_staff_select on public.citations
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy visibility_scores_staff_select on public.visibility_scores
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy audit_reports_staff_select on public.audit_reports
  for select to authenticated using (app.project_in_impersonated_account(project_id));
create policy content_briefs_staff_select on public.content_briefs
  for select to authenticated using (app.project_in_impersonated_account(project_id));

-- Keep the anon role off the customer tables (RLS denies rows anyway; this removes them from
-- the API surface, consistent with 0003).
revoke all on public.competitors, public.topics, public.prompts, public.tracking_runs,
  public.citations, public.visibility_scores, public.audit_reports, public.content_briefs
  from anon;
