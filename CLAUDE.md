# Plutoscope — Engineering Context (CLAUDE.md)

> This file exists so a future session doesn't need the full kickoff prompt again.
> Authoritative spec: `docs/master-planning-document-v4.txt` (Part III is the build
> spec; Part VIII is the week-by-week sprint plan). Read those before non-trivial work.

## What Plutoscope is

An **SEO + AEO + GEO visibility platform**. It tracks how visible a brand/domain is
across traditional Google rankings (SEO), answer surfaces (AEO), and AI generative
engines (GEO — ChatGPT, Perplexity, Gemini), scores a blended visibility index,
audits pages, generates content briefs, and compares against competitors.

**Business model (Part I §4.3):** single-vendor SaaS. **Not** a white-label/reseller
platform. One company (us) operates it, with an **internal admin/support layer that
can impersonate any customer account** for troubleshooting. "Consultant"/"Agency" are
*pricing tiers* for customers who manage multiple client projects under one account —
they are not licensees rebranding the product. Design for this, not for multi-tenant
resale.

## Scope guardrails (do not violate without flagging first)

- **Google AI Overview tracking is deliberately OUT of MVP scope** (Part II). No public
  API; Google v. SerpApi (Dec 2025) + SearchGuard JS challenges make scraping a legal
  risk. It is a disclosed, vendor-mediated **phase-2** decision. Do **not** add it back
  without explicitly flagging to the founder first.
- MVP engines are exactly three, all official first-party APIs: **OpenAI (ChatGPT),
  Perplexity (Sonar), Gemini (Google Search grounding).**
- Engine adapters must be **isolated** — engines can be added/removed/swapped without
  touching the normalizer, scoring, or app layers.
- **Work one week's task block at a time.** Each milestone ends with an acceptance
  checkpoint (Part VIII). Do not start a milestone's tasks before the prior
  checkpoint is met. Tell the founder what was completed before moving on.

## Decisions made (founder-approved)

- **Payment processor: Stripe** (approved 2026-07-20). Stripe Billing for
  subscriptions, Checkout + customer portal. We are merchant of record (handle
  sales-tax/VAT ourselves; Stripe Tax can automate).
- **Page-crawling API vendor: Firecrawl** (approved 2026-07-20). Returns LLM-ready
  markdown + structured metadata for audit scoring. Env key: `FIRECRAWL_API_KEY`.

## Founder decision gates (do NOT decide unilaterally)

- **Google-organic rank-tracking vendor** — founder's call (needed once SEO scoring
  is wired; not blocking Week 1).
- Topic→prompt expansion cap per tier (drives API cost) — needs founder sign-off.
- Whether impersonation is disclosed to customers (before ToS/Privacy + Milestone 5).
- Scoring formula (Week 8) needs founder sign-off before it's built.

## Stack (Part III §17) — Stage 1 (MVP/Beta, <100 accounts)

- **Frontend/app:** Next.js (App Router) + TypeScript + Tailwind, ESLint/Prettier.
  Hosted on **Vercel** (Pro), preview deploy per PR.
- **Backend/data:** **Supabase** (Pro) — Postgres + Auth + Edge Functions + Storage.
- **Scheduling (MVP):** Supabase Edge Functions on timed triggers / Postgres cron.
  No dedicated queue yet. Migrate to Inngest/Trigger.dev at the §17.3 trigger
  (~tens of thousands of runs/day).
- **Caching (optional):** Upstash Redis, added at the §17.3 overlap-query trigger.
- **Error monitoring:** Sentry.
- **Raw API responses:** Postgres `jsonb` for MVP; archive to object storage
  (Supabase Storage/S3) per §17.3 once it bloats.

## Data model (Part III §18) — core entities

Customer-facing (RLS-scoped to Account/Project ownership):
- **Account** — `id, tier, seats, billing_status`. One per subscriber.
- **Project** — `id, account_id, domain, label`. Up to 3 (Starter) / 10 (Consultant).
- **Competitor** — `id, project_id, domain`. Up to 3 per project (MVP).
- **Topic/Prompt** — `id, project_id, text, expanded_prompt_set`. One topic → N prompts.
- **TrackingRun** — `id, project_id, engine, prompt_id, run_at, raw_response`.
  One row per (prompt × engine × schedule tick); stores raw API response for audit.
- **Citation** — `id, tracking_run_id, cited_domain, position, snippet`. Normalized
  from `raw_response`, one row per cited source.
- **VisibilityScore** — `id, project_id, date, seo_score, aeo_score, geo_score,
  blended_index`. Computed rollup per project per period.
- **AuditReport** — `id, project_id, page_url, seo_findings, aeo_findings,
  geo_findings, recommendations`.
- **ContentBrief** — `id, project_id, topic_id, gap_summary, draft_content`.
  Human-in-the-loop — draft is reviewed before use.

Staff realm (SEPARATE auth realm — never mixed into customer Account tables):
- **StaffUser** — `id, email, role (support/engineering/super_admin)`.
- **ImpersonationSession** — `id, staff_user_id, target_account_id, started_at,
  ended_at, reason`. Audit-logged row for every staff access to a customer account.

## Admin/support impersonation (Part III §18.1) — design from Week 1

- StaffUser lives in a **separate auth realm** from customer Accounts.
- RLS policies must include a **verified-staff-session bypass path via a
  SECURITY DEFINER function** from the very start — not `auth.uid()`-only, and not
  retrofitted later.
- "Login as" = mint a **scoped, time-limited session server-side** using the Supabase
  **service-role key (never client-exposed)** — never by knowing/resetting the
  customer's credentials.
- Every impersonation writes an `ImpersonationSession` row automatically (who, which
  account, when, why/ticket ref). This is the audit trail, not optional logging.
- **Read-only by default;** writes require a separate, explicitly-logged elevated mode.
- UX: unmissable persistent banner ("Viewing as [Account] — Admin Session — End
  Session"); sessions auto-expire (30–60 min).

## Per-engine tracking methodology (Part III §19)

- **OpenAI/ChatGPT:** Responses API with `web_search` tool → parse `url_citation`
  annotations → Citation rows. Store full raw response.
- **Perplexity:** Sonar / Sonar Pro API → citations arrive as structured metadata
  (minimal parsing).
- **Gemini:** Gemini API with Google Search grounding → extract `groundingChunks` +
  `groundingSupports` → Citation rows.
- **Google organic (SEO, non-AI):** use a third-party rank-tracking API/vendor — do
  NOT build a SERP scraper in-house.

## Build sequence (Part VIII) — the sprint plan

- **Phase 0 — Foundation (Weeks 1–3):** env/infra, schema, engine prototyping, scheduler.
- **Milestone 1 (Weeks 4–6):** data spine + Perplexity adapter. *Checkpoint: a real
  domain entered via UI produces real Perplexity citations in the DB, no manual steps.*
- **Milestone 2 (Weeks 7–10):** OpenAI + Gemini adapters, scoring, dashboard.
- **Milestone 3 (Weeks 11–14):** audit engine (needs crawl vendor), competitive view.
- **Milestone 4 (Weeks 15–18):** content brief generator, consultant mode, PDF export.
- **Milestone 5 (Weeks 19–21):** billing (needs payment processor), onboarding,
  admin console.
- **Beta & Launch (Weeks 20–28).**

## Conventions

- **Secrets:** never commit API keys. Use Vercel/Supabase env stores. Three MVP keys:
  `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`.
- **Service-role key** is server-side only — never shipped to the client.
- **Migrations:** SQL migrations under `supabase/migrations/`, applied in order.
- **Engine adapters:** each adapter is `(project_id, prompt_id) -> raw_response`;
  normalization is a separate step. Adding an engine = new adapter + normalizer only.
- **Git:** develop on branch `claude/plutoscope-fullstack-setup-z8dy4b`; commit with
  clear messages; push with `git push -u origin <branch>`. Don't open PRs unless asked.

## Implementation status & notes

- **Migrations applied to dev + staging:** `0001` Account+Project · `0002` staff realm +
  RLS bypass · `0003` hardening · `0004` full data spine (Competitor, Topic, Prompt,
  TrackingRun, Citation, VisibilityScore, AuditReport, ContentBrief) with owner + staff-read
  RLS. Regenerate `src/types/database.types.ts` after any migration.
- **Topic/Prompt normalization:** the §18 "Topic/Prompt" entity is split into `topics` (user
  topic) + `prompts` (expanded set). `TrackingRun.prompt_id → prompts.id`. `project_id` is
  denormalized onto `prompts`, `tracking_runs`, `citations` for simple/fast RLS + queries.
- **Child-table RLS** uses `app.owns_project()` (owner, full access) + `app.project_in_
  impersonated_account()` (staff, read-only) SECURITY DEFINER helpers.
- **Tier caps** live in `src/lib/tiers.ts` — `maxPromptsPerTopic` is the AI-API cost lever
  (first-pass numbers, PENDING founder sign-off).
- **Topic→prompt expansion:** `src/lib/tracking/prompt-expansion.ts` (deterministic,
  template-based, per-tier capped; unit-tested with vitest).
- **Engine adapter contract:** `src/lib/engines/types.ts` + documented response shapes in
  `docs/engine-response-shapes.md`. Adapters themselves are built from Milestone 1 (Perplexity
  first). Live prototype verification of the three shapes is DEFERRED until API keys are in a
  deployed env (keys kept in Vercel, not CI).
- **Testing:** vitest (`npm test`); CI runs lint + typecheck + test + build.
- **Scheduler — ENQUEUE (Week 3):** SQL function `app.enqueue_due_tracking_runs(interval)`
  (SECURITY DEFINER) scheduled hourly by **pg_cron** job `plutoscope-enqueue-tracking`
  (migration `0005`); inserts one `pending` tracking_run per (prompt × engine) that's due
  (weekly cadence), idempotently.
- **Scheduler — EXECUTE (Week 4, architecture decision):** runs in **Next.js (Node)**, not the
  Supabase Edge worker — because the engine API keys live in Vercel's env store and keeping all
  adapters in one runtime keeps them unit-testable. Path:
  `GET /api/internal/tracking/process` (secret-gated by `CRON_SECRET`), triggered by **Vercel
  Cron** (`vercel.json`). `src/lib/tracking/process-runs.ts` claims pending runs via the
  service-role admin client, runs the adapter, writes citations, marks succeeded/failed. The
  old Deno `worker` Edge Function is **retired** (redeployed as a 410 stub; removable in the
  Supabase dashboard).
- **Engine adapters:** `src/lib/engines/` — `getAdapter(engine)` registry; `perplexity.ts`
  (Sonar `run` + pure `normalize`, unit-tested) is the first (Milestone 1). OpenAI/Gemini in
  Milestone 2. `src/lib/tracking/url.ts` extracts `cited_domain`.
- **App screens:** placeholder routes under the auth-gated `(app)` route group
  (`/dashboard`, `/projects/new`, `/audit`, `/competitive`, `/briefs`, `/clients`) plus an
  internal `/internal/runs` inspector for TrackingRun/Citation rows (RLS-scoped to the signed-in
  user). Full staff admin console is Milestone 5.

## Live API pricing check (confirmed 2026-07-20)

Mechanisms unchanged from §17.2; only model generations advanced. Re-validate before
committing budget.
- **OpenAI:** `web_search` tool ~**$10 / 1,000 calls**, search content tokens free
  (except mini models bill an 8k-token block). Model generations have advanced past
  GPT-4o (GPT-5.x families now current); pick a current cost-effective model at build
  time. Rate limits tiered by usage tier (RPM/TPM).
- **Perplexity Sonar:** ~**$1/M in + $1/M out**, plus **$5–12 / 1,000 requests** by
  search-context size (Sonar Pro $6–14). Rate limits tiered by lifetime credit spend.
- **Gemini grounding:** **5,000 grounded prompts/month free** (Gemini 3.x, account-
  wide), then **~$14 / 1,000 queries**; retrieved context not billed as input tokens.
- Directional per-project cost still ~**$7–10/mo** across the three engines. Cap
  topic count + refresh cadence per tier.
