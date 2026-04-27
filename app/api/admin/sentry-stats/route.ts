import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org   = process.env.SENTRY_ORG
  const proj  = process.env.SENTRY_PROJECT

  if (!token || !org || !proj) {
    return NextResponse.json({ error: 'missing_env', token: !!token, org: !!org, proj: !!proj })
  }

  try {
    const res = await fetch(
      `https://sentry.io/api/0/projects/${org}/${proj}/issues/?limit=10&query=is:unresolved`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('Sentry API error:', res.status, text.slice(0, 200))
      return NextResponse.json({ error: `sentry_${res.status}` })
    }

    const issues = await res.json()
    return NextResponse.json({
      ok: true,
      unresolvedCount: Array.isArray(issues) ? issues.length : 0,
      issues: (issues as any[]).slice(0, 5).map((i: any) => ({
        id:    i.id,
        title: i.title,
        level: i.level,
        count: i.count,
        firstSeen: i.firstSeen,
      })),
    })
  } catch (err: any) {
    console.error('Sentry fetch error:', err)
    return NextResponse.json({ error: err.message })
  }
}
