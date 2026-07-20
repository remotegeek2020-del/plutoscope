import * as Sentry from '@sentry/nextjs';

// Server-side error monitoring. Inert until NEXT_PUBLIC_SENTRY_DSN is set (Part VIII §43:
// "cheap to add now, painful to retrofit later").
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 1,
});
