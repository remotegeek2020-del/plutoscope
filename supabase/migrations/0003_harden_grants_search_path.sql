-- Migration 0003 — Security hardening (advisor follow-up)
-- Addresses Supabase database-linter findings after 0001/0002:
--   * function_search_path_mutable: pin search_path on helper functions so a caller's
--     search_path can't shadow objects they resolve.
--   * pg_graphql_anon_table_exposed: the `anon` role should not even discover the customer
--     tables in the API schema before sign-in. RLS already denies anon rows; this removes
--     the table from anon's reachable surface entirely. `authenticated` keeps SELECT/DML —
--     RLS (0001/0002) enforces per-account isolation for signed-in users.

alter function app.set_updated_at() set search_path = '';
alter function app.current_impersonation_session_id() set search_path = '';

revoke all on public.accounts from anon;
revoke all on public.projects from anon;
