# Plutoscope — Production Go-Live Checklist

Everything needed to take Plutoscope from the current dev/staging setup to a production
environment for beta and launch (Part VIII §48 Week 21, §49 Beta & Launch). Nothing here has
been auto-provisioned — production infra is a cost/ownership decision left to the founder.

## Environments

| Env | Supabase project | Purpose |
| --- | --- | --- |
| dev | `Plutoscope` (`llvxqllfiwxuaxonnjhe`) | development |
| staging | `Plutoscope Staging` (`wbmivxrenheicaoztnkr`) | pre-prod verification |
| **production** | _create this_ | live customers |

Migrations `0001`–`0011` are applied to dev and staging. Apply the same set, in order, to prod.

## 1. Create the production Supabase project

1. Supabase dashboard → New project → `Plutoscope Production` (Pro tier recommended for backups).
2. Apply migrations in order (`supabase/migrations/0001…0011`) via the SQL editor or
   `supabase db push` (CLI linked to the prod ref).
3. **Auth** → URL config: set Site URL + redirect URLs to the production domain. Keep
   "Confirm email" ON for production.
4. Verify RLS is on for all `public` tables and the `app` schema stays private (not in the
   exposed schemas list). Run the Supabase advisors (Security + Performance) and clear any
   ERROR/WARN beyond the known "authenticated can see RLS-protected tables" pattern.
5. **Bootstrap the first staff user** (for the admin console): create the user via Auth, then
   ```sql
   insert into app.staff_users (user_id, email, role)
   values ('<auth-user-id>', '<email>', 'super_admin');
   ```

## 2. Vercel production project

Import the repo, set the production branch, and add **Environment Variables** (Production scope):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | prod secret key (server-only) |
| `NEXT_PUBLIC_APP_URL` | `https://<prod-domain>` |
| `CRON_SECRET` | long random string |
| `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY` | engine keys |
| `OPENAI_MODEL`, `GEMINI_MODEL` | (optional) current models |
| `FIRECRAWL_API_KEY` | audit crawling |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | live-mode Stripe |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_CONSULTANT` | live Price IDs |
| `CHROMIUM_EXECUTABLE_PATH` | path to `@sparticuz/chromium` (see §4) |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | monitoring |

## 3. Stripe (live mode)

1. Create the **Starter** and **Consultant** products + recurring prices; copy the Price IDs
   into `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_CONSULTANT`.
2. Add a webhook endpoint → `https://<prod-domain>/api/webhooks/stripe`, subscribe to
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Enable Stripe Tax if collecting VAT/sales tax (we are merchant of record).

## 4. PDF export on serverless

`playwright-core` is external (not bundled). On Vercel serverless, add `@sparticuz/chromium`
and set `CHROMIUM_EXECUTABLE_PATH` to its resolved binary path (or run report generation on a
non-serverless worker). Locally it points at the installed Chromium.

## 5. Scheduler

`vercel.json` declares an hourly cron hitting `GET /api/internal/tracking/process`, which
enqueues + executes tracking runs (Bearer `CRON_SECRET`). Confirm the cron is enabled on the
Vercel project. Adjust cadence per tier/cost as volume grows (§17.3 triggers).

## 6. Monitoring

- Create a Sentry project; set the DSN + source-map upload token. Errors are already
  instrumented (server, edge, client, global-error).
- Watch Supabase DB CPU / connection counts; add a read replica when dashboard reads contend
  with tracking writes (§17.3).

## 7. Pre-launch verification (run on staging, then prod)

- [ ] Sign up → email confirm → onboarding → create a project (prompts expand, records saved).
- [ ] Trigger the tracking processor with the real keys → citations + a visibility score appear.
- [ ] Run an audit on a real page → recommendations render.
- [ ] Competitive view shows gaps for a project with competitors + data.
- [ ] Generate a content brief (LLM) → edit → approve.
- [ ] Consultant: switch between ≥3 clients → export a branded PDF.
- [ ] Billing: checkout (test card) → webhook flips tier → portal cancel → back to free.
- [ ] Admin: staff "login as" (reason) → read-only view → end session → customer sees the
      access-log disclosure; non-staff get 404 on `/admin`.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all green in CI.
