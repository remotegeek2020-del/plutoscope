import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the headless-browser lib out of the server bundle (loaded at runtime for PDF export).
  serverExternalPackages: ['playwright-core'],
};

// Sentry wraps the Next config to instrument the build. Source-map upload only happens when
// SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN are set (provisioned later); without them the
// build still succeeds and runtime error capture is governed by NEXT_PUBLIC_SENTRY_DSN.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  telemetry: false,
});
