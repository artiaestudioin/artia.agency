// /api/analyze/route.ts
// Reemplaza analyze.py — K-Means puro en TypeScript, funciona en Vercel Edge/Node sin dependencias.

import { NextRequest, NextResponse } from 'next/server'

// ─── DATOS HISTÓRICOS (benchmarks de agencia digital) ─────────────────────────
// [ingresos, leads, proyectos, score, ticket_promedio, conversion_rate]
const HISTORICAL_DATA: number[][] = [
  // Alto Rendimiento
  [22000, 68, 18, 91, 850, 35.2],
  [19500, 72, 16, 88, 780, 33.1],
  [25000, 80, 20, 94, 920, 38.0],
  [21000, 65, 17, 89, 810, 34.5],
  // Crecimiento Estable
  [14000, 48, 12, 76, 640, 26.8],
  [16000, 52, 13, 79, 680, 28.4],
  [15500, 45, 11, 74, 660, 25.9],
  [13000, 50, 10, 72, 610, 27.0],
  // Atención Requerida
  [7000,  28,  5, 54, 420, 14.2],
  [5500,  20,  4, 48, 380, 12.8],
  [8000,  32,  6, 58, 450, 16.0],
  [6200,  24,  5, 51, 395, 13.5],
]

const CLUSTER_NAMES  = ['Alto Rendimiento', 'Crecimiento Estable', 'Atención Requerida']
const CLUSTER_COLORS = ['#22c55e', '#f59e0b', '#ef4444']
const CLUSTER_ICONS  = ['🚀', '📈', '⚠️']

// ─── MATH HELPERS (sin numpy, puro TS) ───────────────────────────────────────
function normalize(data: number[][]): { norm: number[][], mins: number[], ranges: number[] } {
  const cols = data[0].length
  const mins    = Array(cols).fill(Infinity)
  const maxs    = Array(cols).fill(-Infinity)

  for (const row of data) {
    for (let j = 0; j < cols; j++) {
      if (row[j] < mins[j]) mins[j] = row[j]
      if (row[j] > maxs[j]) maxs[j] = row[j]
    }
  }
  const ranges = mins.map((min, j) => Math.max(maxs[j] - min, 1e-9))
  const norm   = data.map(row => row.map((v, j) => (v - mins[j]) / ranges[j]))
  return { norm, mins, ranges }
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0))
}

function kmeans(data: number[][], k = 3, maxIter = 100): { labels: number[], centroids: number[][] } {
  // Inicializar centroids en índices uniformemente distribuidos
  const step = Math.floor(data.length / k)
  let centroids = Array.from({ length: k }, (_, i) => [...data[i * step]])
  let labels    = Array(data.length).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = data.map(pt => {
      let minD = Infinity, best = 0
      centroids.forEach((c, ci) => {
        const d = euclidean(pt, c)
        if (d < minD) { minD = d; best = ci }
      })
      return best
    })

    if (newLabels.every((l, i) => l === labels[i])) break
    labels = newLabels

    // Recalcular centroids
    centroids = centroids.map((_, ci) => {
      const members = data.filter((_, i) => labels[i] === ci)
      if (!members.length) return centroids[ci]
      const sum = members[0].map((_, j) => members.reduce((s, r) => s + r[j], 0))
      return sum.map(v => v / members.length)
    })
  }

  return { labels, centroids }
}

function clusterQuality(point: number[], centroid: number[]): number {
  const dist    = euclidean(point, centroid)
  const maxDist = Math.sqrt(point.length)
  return Math.max(0, parseFloat((100 - (dist / maxDist) * 100).toFixed(1)))
}

// ─── INSIGHTS ────────────────────────────────────────────────────────────────
function generateInsights(
  current: number[], clusterLabel: number,
  summary: Record<string, any>, ventas: Record<string, any>, leadsD: Record<string, any>
) {
  const [ingresos, leads, proyectos, score, ticket, conv] = current
  const insights: { type: string; icon: string; title: string; text: string }[] = []

  // Health Score
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

  // Conversión
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

  // Cluster
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

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const data     = await req.json()
    const summary  = data.summary  ?? {}
    const ventas   = data.ventas   ?? {}
    const leadsD   = data.leads    ?? {}

    const current: number[] = [
      parseFloat(summary.total_revenue  ?? 0),
      parseFloat(summary.total_leads    ?? 0),
      parseFloat(summary.total_projects ?? 0),
      parseFloat(summary.health_score   ?? 0),
      parseFloat(ventas.ticket_promedio ?? 0),
      parseFloat(leadsD.conversion_rate ?? 0),
    ]

    const allData   = [...HISTORICAL_DATA, current]
    const { norm }  = normalize(allData)
    const { labels, centroids } = kmeans(norm, 3)

    const currentIdx     = allData.length - 1
    const currentLabel   = labels[currentIdx]
    const currentNorm    = norm[currentIdx]
    const currentCentroid = centroids[currentLabel]
    const quality        = clusterQuality(currentNorm, currentCentroid)

    // Puntos para Plotly 3D
    const points = allData.map((row, i) => ({
      x: row[0], y: row[1], z: row[3],
      ticket: row[4], conversion: row[5],
      cluster: labels[i],
      is_current: i === currentIdx,
      label: i === currentIdx ? '📍 Este mes' : `Mes ${i + 1}`,
    }))

    // Promedio del cluster
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

    const insights = generateInsights(current, currentLabel, summary, ventas, leadsD)

    return NextResponse.json({
      status: 'success',
      cluster_assigned: currentLabel,
      cluster_name:     CLUSTER_NAMES[currentLabel],
      cluster_color:    CLUSTER_COLORS[currentLabel],
      cluster_icon:     CLUSTER_ICONS[currentLabel],
      quality_score:    quality,
      points,
      cluster_names:    CLUSTER_NAMES,
      cluster_colors:   CLUSTER_COLORS,
      insights,
      cluster_avg:      clusterAvg,
      current: {
        ingresos:   current[0],
        leads:      current[1],
        proyectos:  current[2],
        score:      current[3],
        ticket:     current[4],
        conversion: current[5],
      },
    })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}
