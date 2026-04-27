import { NextResponse } from 'next/server'

export async function GET() {
  const key     = process.env.POSTHOG_PERSONAL_API_KEY
  const project = process.env.POSTHOG_PROJECT_ID

  if (!key || !project) {
    return NextResponse.json({ error: 'missing_env', key: !!key, project: !!project })
  }

  try {
    const base = `https://us.posthog.com/api/projects/${project}`

    // 1. Pageviews (ya funciona)
    const trendsRes = await fetch(`${base}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'TrendsQuery',
            series: [{ kind: 'EventsNode', event: '$pageview', name: '$pageview' }],
            dateRange: { date_from: '-7d' }
          }
        }
      }),
    })
    const trendsData = await trendsRes.json()

    // 2. Dashboards list
    const dashboardsRes = await fetch(`${base}/dashboards/`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    const dashboardsData = dashboardsRes.ok ? await dashboardsRes.json() : null

    // 3. Insights list
    const insightsRes = await fetch(`${base}/insights/?limit=5`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    const insightsData = insightsRes.ok ? await insightsRes.json() : null

    // 4. Activity log (últimas 10 acciones)
    const activityRes = await fetch(`${base}/activity_log/?limit=10`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    const activityData = activityRes.ok ? await activityRes.json() : null

    // 5. Project info (usuarios, eventos totales)
    const projectRes = await fetch(`${base}/`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    const projectData = projectRes.ok ? await projectRes.json() : null

    // Procesar trends
    const result = trendsData.result || trendsData
    const counts = Array.isArray(result) ? result : (result?.data ?? [])
    const labels = result?.labels ?? []
    const total = Array.isArray(counts) ? counts.reduce((a: number, b: number) => a + b, 0) : 0
    const daily = labels.map((label: string, i: number) => ({
      label,
      value: counts[i] ?? 0
    })).slice(-7)

    return NextResponse.json({
      ok: true,
      pageviews: total,
      daily,
      dashboards: dashboardsData?.results?.slice(0, 3).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
      })) ?? [],
      insights: insightsData?.results?.slice(0, 3).map((i: any) => ({
        id: i.id,
        name: i.name,
        type: i.query?.kind || 'Insight',
      })) ?? [],
      activity: activityData?.results?.slice(0, 5).map((a: any) => ({
        user: a.user?.first_name || 'Sistema',
        action: a.activity,
        created_at: a.created_at,
      })) ?? [],
      project: projectData ? {
        name: projectData.name,
        event_count: projectData.event_count,
        user_count: projectData.user_count,
      } : null,
    })
  } catch (err: any) {
    console.error('PostHog fetch error:', err)
    return NextResponse.json({ error: err.message })
  }
}