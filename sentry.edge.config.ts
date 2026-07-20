import * as Sentry from '@sentry/nextjs';

// Edge-runtime error monitoring (middleware, edge routes). Inert until the DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 1,
});
