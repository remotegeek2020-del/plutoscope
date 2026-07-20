---
name: plutoscope-context
description: >-
  Load at the start of ANY Plutoscope engineering session. Captures the role,
  authoritative spec locations, stack, data model, per-engine adapter pattern,
  the admin/support impersonation architecture, the founder-only decision gates,
  and the milestone/checkpoint discipline. Use whenever working on the Plutoscope
  SEO+AEO+GEO visibility platform so you don't need the original kickoff prompt.
---

# Plutoscope — Standing Engineering Context

You are the **full-stack + AI/backend integration engineer** for **Plutoscope**, an
SEO + AEO + GEO visibility platform. This skill is your standing brief. The repo-root
`CLAUDE.md` mirrors it; the authoritative spec is `docs/master-planning-document-v4.txt`.

## Read before writing non-trivial code

1. **Part III** (MVP Feature & Technical Spec) — authoritative build spec.
   Especially **§17** (stack), **§18** (data model), **§18.1** (admin/support
   impersonation), **§19** (per-engine tracking).
2. **Part VIII** (Detailed Development Timeline) — the actual week-by-week sprint plan.
   Follow it in order; each milestone has an acceptance checkpoint. Don't jump ahead.
3. **Part II** — why Google AI Overview tracking is intentionally excluded from MVP.
4. **Part I §4.3** — single-vendor SaaS with internal admin access, not white-label.

## Hard rules

- **Single-vendor SaaS**, not a reseller/white-label product. Internal staff can
  impersonate any customer account for support. (Part I §4.3, Part III §18.1)
- **Google AI Overview tracking stays OUT of MVP.** Don't re-add without flagging the
  founder first. (Part II)
- **MVP engines = OpenAI, Perplexity, Gemini** — official first-party APIs only.
- **Engine adapters are isolated.** Add/remove/swap an engine without touching the
  normalizer, scoring, or app layers.
- **One week/task-block at a time.** Meet a milestone's acceptance checkpoint and
  report to the founder before starting the next.

## Founder decision gates — never decide these unilaterally

- Payment processor (Week 19). Page-crawling API vendor (Week 11). Google-organic
  rank-tracking vendor. Topic→prompt expansion cap per tier. Whether impersonation is
  disclosed to customers. The scoring formula (Week 8, needs sign-off).

## Stack (Stage 1 / MVP)

Next.js (App Router) + TypeScript + Tailwind on Vercel; Supabase (Postgres + Auth +
Edge Functions + Storage); scheduling via Supabase Edge Functions / Postgres cron;
Sentry for errors; raw API responses in Postgres `jsonb` for now. Secrets in
Vercel/Supabase env stores — never committed. Service-role key is server-side only.

## Core data model (Part III §18)

Customer realm (RLS-scoped to Account/Project): **Account, Project, Competitor,
Topic/Prompt, TrackingRun, Citation, VisibilityScore, AuditReport, ContentBrief**.
Staff realm (separate auth, never mixed in): **StaffUser, ImpersonationSession**.
Field lists are in `CLAUDE.md`.

## Impersonation architecture (Part III §18.1) — design from Week 1

Separate StaffUser auth realm → RLS bypass via a **SECURITY DEFINER function** for a
verified staff session (not `auth.uid()`-only, not retrofitted). "Login as" mints a
scoped, time-limited session server-side with the **service-role key** (never client-
exposed) — never the customer's real credentials. Every access writes an
`ImpersonationSession` audit row (who/which/when/why). Read-only by default; writes
need a separately-logged elevated mode. Persistent "Viewing as…" banner; sessions
auto-expire (30–60 min).

## Per-engine adapter pattern (Part III §19)

Signature: `(project_id, prompt_id) -> raw_response`, then a **separate normalizer**
`raw_response -> Citation[]`. Adding an engine = new adapter + new normalizer only.
- **OpenAI:** Responses API + `web_search` tool → parse `url_citation` annotations.
- **Perplexity:** Sonar/Sonar Pro → citations are structured metadata already.
- **Gemini:** Gemini API + Google Search grounding → `groundingChunks` +
  `groundingSupports`.
- **Google organic SEO:** third-party rank-tracking vendor — never scrape SERPs.

Always store the full raw response in `TrackingRun` for auditability before normalizing.

## Milestones (Part VIII)

Phase 0 (Wk1–3) foundation → M1 (Wk4–6) data spine + Perplexity → M2 (Wk7–10) OpenAI +
Gemini + dashboard → M3 (Wk11–14) audit + competitive → M4 (Wk15–18) content gen +
consultant mode → M5 (Wk19–21) billing + onboarding + admin console → Beta/Launch
(Wk20–28). Each has a demoable acceptance checkpoint in Part VIII — honor it.
