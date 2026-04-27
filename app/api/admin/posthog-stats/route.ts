import { NextResponse } from 'next/server'

export async function GET() {
  const key     = process.env.POSTHOG_PERSONAL_API_KEY
  const project = process.env.POSTHOG_PROJECT_ID

  if (!key || !project) {
    return NextResponse.json({ error: 'missing_env', key: !!key, project: !!project })
  }

  try {
    // PostHog API v2 — pageviews últimos 7 días
    const url = `https://app.posthog.com/api/projects/${project}/insights/trend/`
    const body = {
      events: [{ id: '$pageview', name: '$pageview', type: 'events' }],
      date_from: '-7d',
      display: 'ActionsLineGraph',
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('PostHog API error:', res.status, text.slice(0, 200))
      return NextResponse.json({ error: `posthog_${res.status}`, detail: text.slice(0, 100) })
    }

    const data   = await res.json()
    const result = data.result?.[0]
    const counts = result?.data ?? []
    const total  = counts.reduce((a: number, b: number) => a + b, 0)
    const labels = result?.labels ?? []

    return NextResponse.json({
      ok: true,
      pageviews: total,
      daily: labels.map((label: string, i: number) => ({ label, value: counts[i] ?? 0 })).slice(-7),
    })
  } catch (err: any) {
    console.error('PostHog fetch error:', err)
    return NextResponse.json({ error: err.message })
  }
}
