import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org   = process.env.SENTRY_ORG
  const proj  = process.env.SENTRY_PROJECT

  if (!token || !org || !proj) {
    return NextResponse.json({ error: 'missing_env', token: !!token, org: !!org, proj: !!proj })
  }

  try {
    const base = `https://sentry.io/api/0/projects/${org}/${proj}`

    // 1. Issues (ya funciona)
    const issuesRes = await fetch(`${base}/issues/?limit=10&query=is:unresolved`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const issues = issuesRes.ok ? await issuesRes.json() : []

    // 2. Project stats (eventos 24h)
    const statsRes = await fetch(`${base}/stats/?stat=received&resolution=1h`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const statsData = statsRes.ok ? await statsRes.json() : null

    // 3. Alerts/rules
    const rulesRes = await fetch(`${base}/rules/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const rulesData = rulesRes.ok ? await rulesRes.json() : null

    // 4. Project details
    const projectRes = await fetch(`${base}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const projectData = projectRes.ok ? await projectRes.json() : null

    // Calcular eventos 24h
    const events24h = statsData 
      ? statsData.slice(-24).reduce((s: number, p: [number, number]) => s + p[1], 0)
      : 0

    return NextResponse.json({
      ok: true,
      unresolvedCount: Array.isArray(issues) ? issues.length : 0,
      issues: (issues as any[]).slice(0, 5).map((i: any) => ({
        id: i.id,
        title: i.title,
        level: i.level,
        count: i.count,
        firstSeen: i.firstSeen,
        lastSeen: i.lastSeen,
      })),
      events24h,
      platform: projectData?.platform || 'unknown',
      alerts: (rulesData as any[])?.slice(0, 3).map((r: any) => ({
        id: r.id,
        name: r.name || r.label,
        active: !r.disabled,
      })) ?? [],
    })
  } catch (err: any) {
    console.error('Sentry fetch error:', err)
    return NextResponse.json({ error: err.message })
  }
}