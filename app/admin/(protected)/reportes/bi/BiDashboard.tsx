'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

// ── Importación dinámica de Plotly (evita SSR issues) ──────────────────────
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(124,58,237,0.04)', borderRadius: 16,
      border: '1px dashed rgba(124,58,237,0.2)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 600 }}>Cargando visualización 3D...</p>
      </div>
    </div>
  ),
})

// ── Tipos ──────────────────────────────────────────────────────────────────
interface DataPoint {
  x: number; y: number; z: number
  ticket: number; conversion: number
  cluster: number; is_current: boolean; label: string
}
interface ClusterAvg { ingresos: number; leads: number; proyectos: number; score: number; ticket: number; conversion: number }
interface Insight { type: 'success' | 'warning' | 'danger' | 'info'; icon: string; title: string; text: string }
interface ApiResult {
  status: string
  cluster_assigned: number; cluster_name: string; cluster_color: string; cluster_icon: string
  quality_score: number; points: DataPoint[]; cluster_names: string[]; cluster_colors: string[]
  insights: Insight[]; cluster_avg: ClusterAvg; current: ClusterAvg
}

// ── Colores de cluster ─────────────────────────────────────────────────────
const CLUSTER_BG: Record<number, string> = {
  0: 'rgba(34,197,94,0.08)',
  1: 'rgba(245,158,11,0.08)',
  2: 'rgba(239,68,68,0.08)',
}
const CLUSTER_BORDER: Record<number, string> = {
  0: 'rgba(34,197,94,0.3)',
  1: 'rgba(245,158,11,0.3)',
  2: 'rgba(239,68,68,0.3)',
}
const INSIGHT_STYLES: Record<string, { bg: string; border: string; title: string }> = {
  success: { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.25)',  title: '#15803d' },
  warning: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', title: '#92400e' },
  danger:  { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.25)',  title: '#991b1b' },
  info:    { bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.25)', title: '#5b21b6' },
}

// ── Formatters ─────────────────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ── Componente Principal ───────────────────────────────────────────────────
// Responsive handled via admin-responsive.css classes
export default function BiDashboard({ reportData }: { reportData: Record<string, any> }) {
  const [result, setResult]     = useState<ApiResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [dark, setDark]         = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  // Detectar tema del padre
  useEffect(() => {
    const saved = localStorage.getItem('artia-theme')
    setDark(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => { if (!localStorage.getItem('artia-theme')) setDark(e.matches) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Llamar al API ────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data: ApiResult = await res.json()
      if (data.status !== 'success') throw new Error('El análisis no pudo completarse')
      setResult(data)
      setAnalyzed(true)
    } catch (e: any) {
      setError(e.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [reportData])

  // ── Colores de tema ──────────────────────────────────────────────────────
  const bg      = dark ? '#0f1117' : '#f8fafc'
  const card    = dark ? '#161b27' : '#ffffff'
  const border  = dark ? '#1e2433' : '#e2e8f0'
  const txt1    = dark ? '#f1f5f9' : '#0f172a'
  const txt2    = dark ? '#94a3b8' : '#475569'
  const plotBg  = dark ? '#0f1117' : '#f8fafc'
  const gridClr = dark ? '#1e2433' : '#e2e8f0'

  // ── Construir trazas de Plotly ───────────────────────────────────────────
  const buildTraces = (points: DataPoint[], clusterNames: string[], clusterColors: string[]) => {
    // Una traza por cluster para leyenda correcta
    const traces: any[] = clusterNames.map((name, ci) => {
      const pts = points.filter(p => p.cluster === ci && !p.is_current)
      return {
        type: 'scatter3d',
        mode: 'markers',
        name,
        x: pts.map(p => p.x),
        y: pts.map(p => p.y),
        z: pts.map(p => p.z),
        text: pts.map(p => p.label),
        customdata: pts.map(p => [fmtMoney(p.ticket), `${p.conversion}%`]),
        hovertemplate: '<b>%{text}</b><br>Ingresos: $%{x:,.0f}<br>Leads: %{y}<br>Score: %{z}<br>Ticket: %{customdata[0]}<br>Conversión: %{customdata[1]}<extra></extra>',
        marker: {
          size: 7,
          color: clusterColors[ci],
          opacity: 0.75,
          line: { color: '#ffffff', width: 0.5 },
        },
      }
    })

    // Traza especial para el punto actual
    const cur = points.find(p => p.is_current)
    if (cur) {
      traces.push({
        type: 'scatter3d',
        mode: 'markers+text',
        name: '📍 Mayo 2026',
        x: [cur.x], y: [cur.y], z: [cur.z],
        text: ['Mayo 2026'],
        textposition: 'top center',
        textfont: { size: 12, color: '#ffffff', family: 'SF Mono, monospace' },
        hovertemplate: `<b>📍 Mayo 2026</b><br>Ingresos: $${cur.x.toLocaleString()}<br>Leads: ${cur.y}<br>Score: ${cur.z}<extra></extra>`,
        marker: {
          size: 16,
          color: '#7c3aed',
          opacity: 1,
          symbol: 'diamond',
          line: { color: '#ffffff', width: 2 },
        },
      })
    }
    return traces
  }

  const plotLayout = result ? {
    paper_bgcolor: 'transparent',
    plot_bgcolor:  'transparent',
    margin: { l: 0, r: 0, t: 30, b: 0 },
    legend: {
      orientation: 'h' as const,
      x: 0.5, xanchor: 'center' as const,
      y: -0.05,
      font: { size: 11, color: txt2, family: 'SF Mono, monospace' },
      bgcolor: 'transparent',
    },
    scene: {
      xaxis: { title: { text: 'Ingresos ($)', font: { color: txt2, size: 10 } }, gridcolor: gridClr, zerolinecolor: gridClr, color: txt2, showbackground: false },
      yaxis: { title: { text: 'Leads',         font: { color: txt2, size: 10 } }, gridcolor: gridClr, zerolinecolor: gridClr, color: txt2, showbackground: false },
      zaxis: { title: { text: 'Health Score',  font: { color: txt2, size: 10 } }, gridcolor: gridClr, zerolinecolor: gridClr, color: txt2, showbackground: false },
      bgcolor: 'transparent',
    },
    font: { family: 'SF Mono, monospace', color: txt2 },
  } : {}

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section style={{
      background: card, borderRadius: 20, border: `1px solid ${border}`,
      overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header del módulo */}
      <div style={{
        padding: '24px 28px 20px',
        borderBottom: `1px solid ${border}`,
        background: dark ? 'linear-gradient(135deg, rgba(124,58,237,0.08), transparent)' : 'linear-gradient(135deg, rgba(124,58,237,0.04), transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff', borderRadius: 10, padding: '5px 10px',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.5px',
            }}>
              BI · K-Means
            </span>
            <span style={{ fontSize: 11, color: txt2, fontFamily: 'SF Mono, monospace' }}>
              3 clusters · {12 + 1} puntos de datos
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: txt1 }}>
            Análisis de Rendimiento 3D
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: txt2 }}>
            Clustering inteligente sobre ingresos, leads y health score
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{
            background: loading ? '#6d28d9' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '10px 22px', fontSize: 14, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s', opacity: loading ? 0.8 : 1,
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {loading ? (
            <><SpinnerIcon />Analizando...</>
          ) : analyzed ? (
            <><RefreshIcon />Re-analizar</>
          ) : (
            <>🧠 Ejecutar análisis</>
          )}
        </button>
      </div>

      {/* Estado inicial */}
      {!analyzed && !loading && !error && (
        <div style={{ padding: '64px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔬</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: txt1 }}>
            Motor de BI listo
          </h3>
          <p style={{ fontSize: 14, color: txt2, maxWidth: 420, margin: '0 auto' }}>
            Haz clic en <strong>"Ejecutar análisis"</strong> para procesar los datos de Mayo 2026
            con K-Means clustering y ver tu posición en el espacio 3D vs. meses históricos.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 28 }}>
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 20 }}>❌</span>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#991b1b', fontSize: 14 }}>Error en el análisis</p>
              <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d' }}>{error}</p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: txt2 }}>
                Verifica que <code>/api/analyze</code> esté desplegado en Vercel y el entorno Python esté activo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: 20 }}>
            <SkeletonBlock height={520} dark={dark} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SkeletonBlock height={100} dark={dark} />
              <SkeletonBlock height={100} dark={dark} />
              <SkeletonBlock height={100} dark={dark} />
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {result && !loading && (
        <div style={{ padding: 28 }}>

          {/* Banner de cluster asignado */}
          <div style={{
            background: CLUSTER_BG[result.cluster_assigned],
            border: `1px solid ${CLUSTER_BORDER[result.cluster_assigned]}`,
            borderRadius: 14, padding: '16px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12, marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 36 }}>{result.cluster_icon}</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: txt2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Cluster asignado
                </p>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: result.cluster_color }}>
                  {result.cluster_name}
                </h3>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: txt2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Calidad del fit
              </p>
              <div style={{ fontSize: 28, fontWeight: 900, color: result.cluster_color, fontFamily: 'SF Mono, monospace' }}>
                {result.quality_score}%
              </div>
            </div>
          </div>

          {/* Grid: Gráfico 3D + Panel lateral */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: 24, alignItems: 'start' }}>

            {/* Gráfico 3D */}
            <div style={{ background: dark ? '#0d111c' : '#f8fafc', borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden', padding: 8 }}>
              <Plot
                data={buildTraces(result.points, result.cluster_names, result.cluster_colors) as any}
                layout={plotLayout as any}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: 480 }}
              />
            </div>

            {/* Panel lateral: KPIs + Benchmarks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tu posición */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: txt2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  📍 Tu posición (Mayo 2026)
                </p>
                <MetricRow label="Ingresos"   value={fmtMoney(result.current.ingresos)}   dark={dark} />
                <MetricRow label="Leads"      value={`${result.current.leads}`}            dark={dark} />
                <MetricRow label="Score"      value={`${result.current.score}/100`}         dark={dark} />
                <MetricRow label="Ticket avg" value={fmtMoney(result.current.ticket)}       dark={dark} />
                <MetricRow label="Conversión" value={`${result.current.conversion}%`}       dark={dark} last />
              </div>

              {/* Promedio del cluster */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: txt2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  📊 Promedio del cluster
                </p>
                <MetricRow label="Ingresos"   value={fmtMoney(result.cluster_avg.ingresos)}  dark={dark} />
                <MetricRow label="Leads"      value={`${result.cluster_avg.leads}`}           dark={dark} />
                <MetricRow label="Score"      value={`${result.cluster_avg.score}/100`}        dark={dark} />
                <MetricRow label="Ticket avg" value={fmtMoney(result.cluster_avg.ticket)}      dark={dark} />
                <MetricRow label="Conversión" value={`${result.cluster_avg.conversion}%`}      dark={dark} last />
              </div>

              {/* Leyenda de clusters */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: txt2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  🗺️ Mapa de clusters
                </p>
                {result.cluster_names.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: result.cluster_colors[i], flexShrink: 0 }} />
                    <span style={{
                      fontSize: 13, fontWeight: i === result.cluster_assigned ? 700 : 500,
                      color: i === result.cluster_assigned ? result.cluster_color : txt2,
                    }}>
                      {name} {i === result.cluster_assigned ? '← tú' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div style={{ marginTop: 24 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: txt2, textTransform: 'uppercase', letterSpacing: '1px' }}>
              💡 Insights automáticos
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {result.insights.map((ins, i) => {
                const s = INSIGHT_STYLES[ins.type] ?? INSIGHT_STYLES.info
                return (
                  <div key={i} style={{
                    background: s.bg, border: `1px solid ${s.border}`,
                    borderRadius: 14, padding: '16px 18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{ins.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.title }}>{ins.title}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: txt2, lineHeight: 1.5 }}>{ins.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer técnico */}
          <div style={{
            marginTop: 20, padding: '12px 16px',
            background: dark ? 'rgba(30,36,51,0.5)' : '#f8fafc',
            borderRadius: 10, border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔧</span>
            <p style={{ margin: 0, fontSize: 12, color: txt2, fontFamily: 'SF Mono, monospace' }}>
              Algoritmo: K-Means (k=3, iteraciones=100) · Backend: Python/NumPy en Vercel Serverless ·
              Datos: 12 meses históricos + Mayo 2026 · Ejes: Ingresos × Leads × Health Score
            </p>
          </div>

        </div>
      )}
    </section>
  )
}

// ── Sub-componentes ─────────────────────────────────────────────────────────
function MetricRow({ label, value, dark, last }: { label: string; value: string; dark: boolean; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: last ? 0 : 8, marginBottom: last ? 0 : 8,
      borderBottom: last ? 'none' : `1px solid ${dark ? '#1e2433' : '#f1f5f9'}`,
    }}>
      <span style={{ fontSize: 12, color: dark ? '#64748b' : '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a', fontFamily: 'SF Mono, monospace' }}>{value}</span>
    </div>
  )
}

function SkeletonBlock({ height, dark }: { height: number; dark: boolean }) {
  return (
    <div style={{
      height, borderRadius: 16,
      background: dark ? '#161b27' : '#f1f5f9',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
      <path d="M8 2 A6 6 0 0 1 14 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 7.5A6 6 0 0 1 7.5 1.5c1.8 0 3.4.8 4.5 2M13.5 7.5A6 6 0 0 1 7.5 13.5c-1.8 0-3.4-.8-4.5-2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10.5 3l1.5-1.5 1.5 1.5M4.5 12l-1.5 1.5-1.5-1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
