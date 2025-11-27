import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "",
  environment:
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [],
  ignoreErrors: [
    "AbortError",
    "ResizeObserver loop limit exceeded",
  ],
});
