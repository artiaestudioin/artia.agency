import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate:         1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText:   false,
      blockAllMedia: false,
    }),
  ],

  enabled:     process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
})

// Instrumenta las navegaciones del router de Next.js 15
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
