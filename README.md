# Plutoscope

SEO + AEO + GEO visibility platform. A single-vendor SaaS that tracks how visible a
brand/domain is across Google organic rankings (SEO), answer surfaces (AEO), and AI
generative engines (GEO — ChatGPT, Perplexity, Gemini), scores a blended visibility index,
audits pages, generates content briefs, and compares against competitors.

> **Build agents / engineers:** the authoritative spec is
> [`docs/master-planning-document-v4.txt`](docs/master-planning-document-v4.txt) — Part III is
> the engineering spec, Part VIII is the week-by-week sprint plan. Read
> [`CLAUDE.md`](CLAUDE.md) first for the condensed stack, data model, conventions, and the
> founder decision gates.

## Stack (Stage 1 — MVP/Beta)

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**, hosted on **Vercel**
- **Supabase** — Postgres + Auth + Edge Functions + Storage (RLS for account isolation)
- **Sentry** — error monitoring
- Payments: **Stripe** · Page crawling: **Firecrawl** (approved vendors)

## Local development

1. Install Node 20+ and dependencies:
   ```bash
   npm install
   ```
2. Copy env and fill in values (see [`.env.example`](.env.example)):
   ```bash
   cp .env.example .env.local
   ```
   At minimum you need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` for the **dev** Supabase project.
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Script                 | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the dev server                |
| `npm run build`        | Production build                    |
| `npm run lint`         | ESLint (next/core-web-vitals)       |
| `npm run typecheck`    | `tsc --noEmit`                      |
| `npm run format`       | Prettier write                      |
| `npm run format:check` | Prettier check (CI)                 |

## Database & migrations

SQL migrations live in [`supabase/migrations/`](supabase/migrations/) and are the source of
truth, applied in order:

- `0001_account_project.sql` — Account + Project tables, account-level RLS.
- `0002_staff_impersonation_rls.sql` — StaffUser + ImpersonationSession (separate `app` realm)
  and the verified-staff-session RLS bypass via a `SECURITY DEFINER` function (Part III §18.1).
- `0003_harden_grants_search_path.sql` — pin function `search_path`; revoke `anon` from
  customer tables.

Two Supabase environments back this: **dev** and **staging** (Part VIII §43). Regenerate DB
types after a migration:

```bash
supabase gen types typescript --project-id <ref> > src/types/database.types.ts
```

## Environments & secrets

Secrets are **never** committed. Local: `.env.local`. Preview/prod: the Vercel and Supabase
environment-variable stores. The Supabase **service-role key** is server-only (it powers the
staff-impersonation flow) and must never be exposed to the browser.

## CI/CD

- **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs
  lint + typecheck + build on every push and PR.
- **Vercel** provides a preview deployment per pull request (configured in the Vercel
  dashboard via the GitHub integration).
