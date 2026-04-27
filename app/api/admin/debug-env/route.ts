// app/api/admin/debug-env/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    sentry_org: process.env.SENTRY_ORG,
    sentry_project: process.env.SENTRY_PROJECT,
    sentry_token_prefix: process.env.SENTRY_AUTH_TOKEN?.slice(0, 8),
    posthog_project: process.env.POSTHOG_PROJECT_ID,
    posthog_key_prefix: process.env.POSTHOG_PERSONAL_API_KEY?.slice(0, 8),
  })
}