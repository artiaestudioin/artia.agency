import { NextResponse } from 'next/server'

export async function GET() {
  const key     = process.env.POSTHOG_PERSONAL_API_KEY
  const project = process.env.POSTHOG_PROJECT_ID

  if (!key || !project) {
    return NextResponse.json({ error: 'missing_env', key: !!key, project: !!project })
  }

  try {
    // PostHog Personal API Key → usa endpoint GET /insights/ con query params
    // o el nuevo endpoint /query/ para trends
    const url = `https://us.posthog.com/api/projects/${project}/query/`

    const body = {
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "TrendsQuery",
          series: [{ kind: "EventsNode", event: "$pageview", name: "$pageview" }],
          dateRange: { date_from: "-7d" }
        }
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('PostHog API error:', res.status, text.slice(0, 500))
      return NextResponse.json({ 
        error: `posthog_${res.status}`, 
        detail: text.slice(0, 200),
        url: url.replace(key, '***')
      })
    }

    const data = await res.json()

    // El nuevo endpoint devuelve resultado diferente
    const result = data.result || data
    const counts = Array.isArray(result) ? result : (result?.data ?? [])
    const labels = result?.labels ?? []

    // Si no hay datos estructurados, intentar extraer de la respuesta
    let daily = []
    let total = 0

    if (Array.isArray(counts) && counts.length > 0) {
      total = counts.reduce((a: number, b: number) => a + b, 0)
      daily = labels.map((label: string, i: number) => ({ 
        label, 
        value: counts[i] ?? 0 
      })).slice(-7)
    } else if (data.results) {
      // Formato alternativo
      total = data.results.reduce((s: number, r: any) => s + (r.count || 0), 0)
      daily = (data.results || []).slice(-7).map((r: any) => ({
        label: r.label || r.date || '?',
        value: r.count || 0
      }))
    }

    return NextResponse.json({
      ok: true,
      pageviews: total,
      daily,
      raw_preview: JSON.stringify(data).slice(0, 200) // para debug
    })
  } catch (err: any) {
    console.error('PostHog fetch error:', err)
    return NextResponse.json({ error: err.message })
  }
}