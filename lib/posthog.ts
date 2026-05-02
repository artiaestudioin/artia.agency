// lib/posthog.ts
import posthog from 'posthog-js'

export function initPostHog(apiKey: string) {
  if (typeof window === 'undefined') return

  posthog.init(apiKey, {
    api_host: 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    },
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
        email: true,
      },
    },
  })
}

export function captureEvent(event: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return
  posthog.capture(event, properties)
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, traits)
}

export function captureLandingEvent(
  landingId: string,
  eventType: string,
  extraProps?: Record<string, any>
) {
  captureEvent(`landing_${eventType}`, {
    landing_id: landingId,
    ...extraProps,
  })
}
