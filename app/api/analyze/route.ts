// app/api/analyze/route.ts
// K-Means con histórico real desde Supabase.
// El mes actual sigue llegando desde el frontend (reportData).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Cliente Supabase (service_role igual que tus otras API routes) ────────────
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── FALLBACK si Supabase no tiene datos aún ─────────────────────────────────
// [ingresos, leads, proyectos, score, ticket_promedio, conversion_rate]
const FALLBACK_HISTORICAL: number[][] = [
  [22000, 68, 18, 91, 850, 35.2],
  [19500, 72, 16, 88, 780, 33.1],
  [25000, 80, 20, 94, 920, 38.0],
  [21000, 65, 17, 89, 810, 34.5],
  [14000, 48, 12, 76, 640, 26.8],
  [16000, 52, 13, 79, 680, 28.4],
  [15500, 45, 11, 74, 660, 25.9],
  [13000, 50, 10, 72, 610, 27.0],
  [7000,  28,  5, 54, 420, 14.2],
  [5500,  20,  4, 48, 380, 12.8],
  [8000,  32,  6, 58, 450, 16.0],
  [6200,  24,  5, 51, 395, 13.5],
]

const CLUSTER_NAMES  = ['Alto Rendimiento', 'Crecimiento Estable', 'Atención Requerida']
const CLUSTER_COLORS = ['#22c55e', '#f59e0b', '#ef4444']
const CLUSTER_ICONS  = ['🚀', '📈', '⚠️']

// ─── MATH HELPERS ─────────────────────────────────────────────────────────────
function normalize(data: number[][]): { norm: number[][] } {
  const cols = data[0].length
  const mins = Array(cols).fill(Infinity)
  const maxs = Array(cols).fill(-Infinity)
  for (const row of data) {
    for (let j = 0; j < cols; j++) {
      if (row[j] < mins[j]) mins[j] = row[j]
      if (row[j] > maxs[j]) maxs[j] = row[j]
    }
  }
  const ranges = mins.map((min, j) => Math.max(maxs[j] - min, 1e-9))
  const norm   = data.map(row => row.map((v, j) => (v - mins[j]) / ranges[j]))
  return { norm }
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0))
}

function kmeans(data: number[][], k = 3, maxIter = 100): { labels: number[], centroids: number[][] } {
  const step = Math.floor(data.length / k)
  let centroids = Array.from({ length: k }, (_, i) => [...data[i * step]])
  let labels    = Array(data.length).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = data.map(pt => {
      let minD = Infinity, best = 0
      centroids.forEach((c, ci) => { const d = euclidean(pt, c); if (d < minD) { minD = d; best = ci } })
      return best
    })
    if (newLabels.every((l, i) => l === labels[i])) break
    labels = newLabels
    centroids = centroids.map((_, ci) => {
      const members = data.filter((_, i) => labels[i] === ci)
      if (!members.length) return centroids[ci]
      return members[0].map((_, j) => members.reduce((s, r) => s + r[j], 0) / members.length)
    })
  }
  return { labels, centroids }
}

function clusterQuality(point: number[], centroid: number[]): number {
  const dist    = euclidean(point, centroid)
  const maxDist = Math.sqrt(point.length)
  return Math.max(0, parseFloat((100 - (dist / maxDist) * 100).toFixed(1)))
}

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────
function generateInsights(
  current: number[], clusterLabel: number,
  summary: Record<string, any>, ventas: Record<string, any>, leadsD: Record<string, any>
) {
  const [, , , score] = current
  const insights: { type: string; icon: string; title: string; text: string }[] = []

  if (score >= 85) {
    insights.push({ type: 'success', icon: '🏆', title: 'Salud Excelente',
      text: `Tu health score de ${score} supera el umbral óptimo (85+). Mantén el ritmo.` })
  } else if (score >= 70) {
    insights.push({ type: 'warning', icon: '📊', title: 'Salud Buena',
      text: `Score ${score}/100. Hay margen para mejorar: enfócate en cobranza y conversión.` })
  } else {
    insights.push({ type: 'danger', icon: '🚨', title: 'Salud Crítica',
      text: `Score ${score}/100. Prioriza urgentemente: recupera cartera vencida y activa leads fríos.` })
  }

  const cohorte = leadsD?.cohorte ?? {}
  const l2p: number = cohorte.conversion_lead_a_proyecto_pct ?? 0
  if (l2p < 30) {
    insights.push({ type: 'danger', icon: '🔴', title: 'Conversión Baja',
      text: `Solo ${l2p}% de leads se convierten en proyectos. Revisa tu proceso de cierre.` })
  } else if (l2p >= 50) {
    insights.push({ type: 'success', icon: '✅', title: 'Conversión Sólida',
      text: `${l2p}% de leads → proyectos. Excelente calidad de pipeline.` })
  } else {
    insights.push({ type: 'info', icon: '💡', title: 'Conversión Moderada',
      text: `${l2p}% conversión lead→proyecto. El benchmark del cluster es 40%+.` })
  }

  if (clusterLabel === 0) {
    insights.push({ type: 'success', icon: '🚀', title: 'Mejor del Cluster',
      text: 'Estás en el grupo de Alto Rendimiento. Documenta qué estás haciendo bien y escala.' })
  } else if (clusterLabel === 1) {
    insights.push({ type: 'info', icon: '📈', title: 'Crecimiento Estable',
      text: 'Estás en trayectoria de crecimiento. Un 20% más en leads te llevaría a Alto Rendimiento.' })
  } else {
    insights.push({ type: 'danger', icon: '⚠️', title: 'Acción Inmediata',
      text: 'Este cluster requiere intervención. Enfócate en 3 acciones: activar leads, cobrar pendientes, reactivar proyectos pausados.' })
  }

  return insights
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const data     = await req.json()
    const summary  = data.summary  ?? {}
    const ventas   = data.ventas   ?? {}
    const leadsD   = data.leads    ?? {}
    const proyectos = data.proyectos ?? {}
    const finanzas  = data.finanzas  ?? {}
    const month: string = data.month ?? 'Este mes'

    // ── 1. Leer histórico desde Supabase ──────────────────────────────────────
    const supabase = getSupabase()
    const { data: rows, error } = await supabase
      .from('bi_metricas_mensuales')
      .select('mes, ingresos, leads, proyectos, health_score, ticket_promedio, conversion_rate')
      .order('mes', { ascending: true })

    const fromSupabase = !error && rows && rows.length >= 3

    const historicalData: number[][] = fromSupabase
      ? rows!.map((r: any) => [
          Number(r.ingresos),
          Number(r.leads),
          Number(r.proyectos),
          Number(r.health_score),
          Number(r.ticket_promedio),
          Number(r.conversion_rate),
        ])
      : FALLBACK_HISTORICAL

    const historicalLabels: string[] = fromSupabase
      ? rows!.map((r: any) => {
          const d = new Date(r.mes + 'T12:00:00')
          return d.toLocaleDateString('es-EC', { month: 'short', year: '2-digit' })
        })
      : historicalData.map((_, i) => `Mes ${i + 1}`)

    // ── 2. Mes actual (viene del frontend) ────────────────────────────────────
    const current: number[] = [
      parseFloat(summary.total_revenue  ?? 0),
      parseFloat(summary.total_leads    ?? 0),
      parseFloat(summary.total_projects ?? 0),
      parseFloat(summary.health_score   ?? 0),
      parseFloat(ventas.ticket_promedio ?? 0),
      parseFloat(leadsD.conversion_rate ?? 0),
    ]

    // ── 3. K-Means ────────────────────────────────────────────────────────────
    const allData   = [...historicalData, current]
    const allLabels = [...historicalLabels, `📍 ${month}`]
    const { norm }  = normalize(allData)
    const { labels, centroids } = kmeans(norm, 3)

    const currentIdx   = allData.length - 1
    const currentLabel = labels[currentIdx]
    const quality      = clusterQuality(norm[currentIdx], centroids[currentLabel])

    // ── 4. Puntos para Plotly 3D ──────────────────────────────────────────────
    const points = allData.map((row, i) => ({
      x: row[0], y: row[1], z: row[3],
      ticket: row[4], conversion: row[5],
      cluster: labels[i],
      is_current: i === currentIdx,
      label: allLabels[i],
    }))

    // ── 5. Promedio del cluster ───────────────────────────────────────────────
    const clusterMembers = allData.filter((_, i) => labels[i] === currentLabel && i !== currentIdx)
    const clusterAvgRaw  = clusterMembers.length
      ? clusterMembers[0].map((_, j) => clusterMembers.reduce((s, r) => s + r[j], 0) / clusterMembers.length)
      : current

    const clusterAvg = {
      ingresos:   Math.round(clusterAvgRaw[0]),
      leads:      Math.round(clusterAvgRaw[1]),
      proyectos:  Math.round(clusterAvgRaw[2]),
      score:      parseFloat(clusterAvgRaw[3].toFixed(1)),
      ticket:     Math.round(clusterAvgRaw[4]),
      conversion: parseFloat(clusterAvgRaw[5].toFixed(1)),
    }

    // ── 6. Guardar mes actual en Supabase (upsert, fire-and-forget) ───────────
    const now     = new Date()
    const mesDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    supabase.rpc('upsert_bi_mes_actual', {
      p_mes:                           mesDate,
      p_ingresos:                      current[0],
      p_leads:                         current[1],
      p_proyectos:                     current[2],
      p_health_score:                  current[3],
      p_ticket_promedio:               current[4],
      p_conversion_rate:               current[5],
      p_total_facturado:               finanzas.total_facturado                        ?? 0,
      p_total_cobrado:                 finanzas.total_cobrado                           ?? 0,
      p_total_pendiente:               finanzas.total_pendiente                         ?? 0,
      p_vencido:                       finanzas.vencido                                 ?? 0,
      p_cartera_sana_pct:              finanzas.cartera_sana_pct                        ?? 0,
      p_cobranza_rate:                 finanzas.cobranza_rate                           ?? 0,
      p_total_orders:                  ventas.total_orders                              ?? 0,
      p_leads_convertidos:             leadsD.convertidos                               ?? 0,
      p_proyectos_completados:         proyectos.completados                            ?? 0,
      p_lead_time_promedio_dias:       proyectos.lead_time_promedio_dias                ?? 0,
      p_dias_promedio_lead_a_proyecto: leadsD.cohorte?.dias_promedio_lead_a_proyecto   ?? 0,
      p_funnel_drop_pct:               leadsD.cohorte?.funnel_drop_pct                 ?? 0,
    }).then(({ error: rpcErr }) => {
      if (rpcErr) console.error('[BI] upsert error:', rpcErr.message)
    })

    // ── 7. Respuesta ──────────────────────────────────────────────────────────
    return NextResponse.json({
      status:           'success',
      cluster_assigned: currentLabel,
      cluster_name:     CLUSTER_NAMES[currentLabel],
      cluster_color:    CLUSTER_COLORS[currentLabel],
      cluster_icon:     CLUSTER_ICONS[currentLabel],
      quality_score:    quality,
      points,
      cluster_names:    CLUSTER_NAMES,
      cluster_colors:   CLUSTER_COLORS,
      insights:         generateInsights(current, currentLabel, summary, ventas, leadsD),
      cluster_avg:      clusterAvg,
      current: {
        ingresos:   current[0],
        leads:      current[1],
        proyectos:  current[2],
        score:      current[3],
        ticket:     current[4],
        conversion: current[5],
      },
      meta: {
        historical_months: historicalData.length,
        source: fromSupabase ? 'supabase' : 'fallback',
      },
    })

  } catch (err: any) {
    console.error('[BI] route error:', err)
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}