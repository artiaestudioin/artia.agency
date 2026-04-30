'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ─── Types ─────────────────────────────────────────────────────────

type PaymentParent = {
  id: string
  lead_id: string
  contract_value: number
  description: string | null
  payment_month: string | null
  status: string
  created_at: string
  installments: {
    id?: string
    amount: number
    payment_date: string
    status: 'pagado' | 'pendiente' | 'vencido'
    payment_method?: string
    payment_number: number
  }[]
  lead: {
    nombre: string
    folio: string | null
    servicio: string | null
  } | null
}

type Lead = {
  id: string
  nombre: string
  folio: string | null
  servicio: string | null
  estado: string | null
  estimated_value: number | null
  created_at: string
}

type Project = {
  id: string
  name: string
  status: string
  event_date: string | null
  created_at: string
  lead: { nombre: string; folio: string | null } | null
}

type EmailSend = {
  id: string
  to_email: string
  template_name: string
  sent_at: string
  opened: boolean
}

type PhData = {
  pageviews: number
  daily: { label: string; value: number }[]
}

type SentryData = {
  unresolvedCount: number
  events24h: number
  issues: { level: string; count: string }[]
}

// ─── Colors ────────────────────────────────────────────────────────

const COLORS = {
  primary:   ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  success:   ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
  warning:   ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
  danger:    ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
  info:      ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
  gradient:  ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
}

const ESTADO_COLORS_MAP: Record<string, string> = {
  nuevo: '#3b82f6', contactado: '#f59e0b', en_proceso: '#8b5cf6',
  cerrado: '#10b981', perdido: '#ef4444', activo: '#10b981',
  completado: '#059669', pendiente: '#d97706', vencido: '#dc2626',
}

// ─── Helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

function getMonthKey(d: string) {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })
}

// ─── Component ─────────────────────────────────────────────────────

export default function ReportesClient({
  payments,
  leads,
  projects,
  emails,
  posthog,
  sentry,
}: {
  payments: PaymentParent[]
  leads: Lead[]
  projects: Project[]
  emails: EmailSend[]
  posthog: PhData | null
  sentry: SentryData | null
}) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'general' | 'finanzas' | 'leads' | 'proyectos' | 'analytics'>('general')
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  // ── Filter by date range ──
  const cutoffDate = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case '7d': return new Date(now.getTime() - 7 * 86400000)
      case '30d': return new Date(now.getTime() - 30 * 86400000)
      case '90d': return new Date(now.getTime() - 90 * 86400000)
      case '1y': return new Date(now.getTime() - 365 * 86400000)
      default: return new Date(0)
    }
  }, [dateRange])

  // Un contrato aplica si fue creado en el rango O si tiene cuotas con fecha en el rango.
  // Usamos cutoffDate = new Date(0) para 'all', por lo que siempre pasa.
  const filteredPayments = payments.filter(p => {
    if (new Date(p.created_at) >= cutoffDate) return true
    return p.installments.some(i => i.payment_date && new Date(i.payment_date) >= cutoffDate)
  })
  const filteredLeads    = leads.filter(l => {
    const d = new Date(l.created_at)
    return !isNaN(d.getTime()) && d >= cutoffDate
  })
  const filteredProjects = projects.filter(p => {
    const d = new Date(p.created_at)
    return !isNaN(d.getTime()) && d >= cutoffDate
  })
  const filteredEmails   = emails.filter(e => {
    const d = new Date(e.sent_at)
    return !isNaN(d.getTime()) && d >= cutoffDate
  })

  // ── Computed Data ──
  const financeData = useMemo(() => {
    const totalFacturado = filteredPayments.reduce((s, p) => s + (p.contract_value || 0), 0)
    const totalPagado = filteredPayments.reduce((s, p) =>
      s + p.installments.filter(i => i.status === 'pagado').reduce((sum, i) => sum + (Number(i.amount) || 0), 0), 0)
    const totalPendiente = totalFacturado - totalPagado
    const totalVencido = filteredPayments.reduce((s, p) =>
      s + p.installments.filter(i => i.status === 'vencido').reduce((sum, i) => sum + (Number(i.amount) || 0), 0), 0)
    
    // Monthly revenue data
    const monthlyMap = new Map<string, { month: string; facturado: number; pagado: number; pendiente: number }>()
    filteredPayments.forEach(p => {
      const key = getMonthKey(p.created_at)
      const label = getMonthLabel(p.created_at)
      const existing = monthlyMap.get(key) || { month: label, facturado: 0, pagado: 0, pendiente: 0 }
      existing.facturado += p.contract_value || 0
      existing.pagado += p.installments.filter(i => i.status === 'pagado').reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
      existing.pendiente += p.installments.filter(i => i.status !== 'pagado').reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
      monthlyMap.set(key, existing)
    })
    const monthlyRevenue = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    // Payment method distribution
    const methodMap = new Map<string, number>()
    filteredPayments.forEach(p => {
      p.installments.filter(i => i.status === 'pagado').forEach(i => {
        const method = i.payment_method || 'otro'
        methodMap.set(method, (methodMap.get(method) || 0) + Number(i.amount))
      })
    })
    const methodData = Array.from(methodMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: COLORS.primary[methodMap.size % COLORS.primary.length]
    }))

    // Status distribution
    const statusCounts = [
      { name: 'Pagado', value: filteredPayments.filter(p => p.installments.every(i => i.status === 'pagado')).length, color: '#10b981' },
      { name: 'En progreso', value: filteredPayments.filter(p => p.installments.some(i => i.status === 'pendiente')).length, color: '#f59e0b' },
      { name: 'Con vencidas', value: filteredPayments.filter(p => p.installments.some(i => i.status === 'vencido')).length, color: '#ef4444' },
    ]

    return { totalFacturado, totalPagado, totalPendiente, totalVencido, monthlyRevenue, methodData, statusCounts }
  }, [filteredPayments])

  const leadsData = useMemo(() => {
    const byStatus = Object.entries(
      filteredLeads.reduce((acc, l) => {
        acc[l.estado || 'nuevo'] = (acc[l.estado || 'nuevo'] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '), value, color: ESTADO_COLORS_MAP[name] || '#94a3b8' }))

    const byService = Object.entries(
      filteredLeads.reduce((acc, l) => {
        const svc = l.servicio || 'Sin servicio'
        acc[svc] = (acc[svc] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)

    // Monthly leads
    const monthlyMap = new Map<string, { month: string; leads: number; valor: number }>()
    filteredLeads.forEach(l => {
      const key = getMonthKey(l.created_at)
      const label = getMonthLabel(l.created_at)
      const existing = monthlyMap.get(key) || { month: label, leads: 0, valor: 0 }
      existing.leads += 1
      existing.valor += l.estimated_value || 0
      monthlyMap.set(key, existing)
    })
    const monthlyLeads = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    return { byStatus, byService, monthlyLeads, total: filteredLeads.length, totalValue: filteredLeads.reduce((s, l) => s + (l.estimated_value || 0), 0) }
  }, [filteredLeads])

  const projectsData = useMemo(() => {
    const byStatus = Object.entries(
      filteredProjects.reduce((acc, p) => {
        acc[p.status || 'activo'] = (acc[p.status || 'activo'] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: ESTADO_COLORS_MAP[name] || '#94a3b8' }))

    const monthlyMap = new Map<string, { month: string; proyectos: number }>()
    filteredProjects.forEach(p => {
      const key = getMonthKey(p.created_at)
      const label = getMonthLabel(p.created_at)
      const existing = monthlyMap.get(key) || { month: label, proyectos: 0 }
      existing.proyectos += 1
      monthlyMap.set(key, existing)
    })
    const monthlyProjects = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    return { byStatus, monthlyProjects, total: filteredProjects.length }
  }, [filteredProjects])

  const emailData = useMemo(() => {
    const total = filteredEmails.length
    const opened = filteredEmails.filter(e => e.opened).length
    const rate = total > 0 ? Math.round((opened / total) * 100) : 0
    
    const byTemplate = Object.entries(
      filteredEmails.reduce((acc, e) => {
        acc[e.template_name || 'Sin plantilla'] = (acc[e.template_name || 'Sin plantilla'] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)

    return { total, opened, rate, byTemplate }
  }, [filteredEmails])

  // ── Export PDF ──
  async function exportPDF() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1400,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      
      let heightLeft = imgHeight * ratio
      let position = 0
      
      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio)
      heightLeft -= pdfHeight
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio)
        heightLeft -= pdfHeight
      }
      
      pdf.save(`reporte-artia-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
      alert('Error al generar PDF')
    } finally {
      setExporting(false)
    }
  }

  // ── Custom Tooltip ──
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    return (
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: '12px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
            <span style={{ color: '#64748b' }}>{p.name}:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {typeof p.value === 'number' && p.value > 1000 ? fmtMoney(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
      <style>{ANIMATIONS}</style>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#00113a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              📊 Reportes & Analytics
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Visualización completa del rendimiento de tu negocio
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Date Range */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, gap: 2 }}>
              {[
                { key: '7d', label: '7 días' },
                { key: '30d', label: '30 días' },
                { key: '90d', label: '90 días' },
                { key: '1y', label: '1 año' },
                { key: 'all', label: 'Todo' },
              ].map(r => (
                <button
                  key={r.key}
                  onClick={() => setDateRange(r.key as any)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: dateRange === r.key ? '#00113a' : 'transparent',
                    color: dateRange === r.key ? '#fff' : '#64748b',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={exportPDF}
              disabled={exporting}
              style={{
                padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
                background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: exporting ? 'none' : '0 4px 16px rgba(239,68,68,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {exporting ? '⏳ Generando…' : '📄 Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 20, borderBottom: '2px solid #f1f5f9', paddingBottom: 2 }}>
          {[
            { key: 'general', label: '📈 General', icon: '📈' },
            { key: 'finanzas', label: '💰 Finanzas', icon: '💰' },
            { key: 'leads', label: '👥 Leads', icon: '👥' },
            { key: 'proyectos', label: '📁 Proyectos', icon: '📁' },
            { key: 'analytics', label: '📡 Analytics', icon: '📡' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: '10px 20px', borderRadius: '10px 10px 0 0', fontSize: 13, fontWeight: 700,
                border: 'none', borderBottom: `3px solid ${activeTab === t.key ? '#00113a' : 'transparent'}`,
                background: 'transparent', color: activeTab === t.key ? '#00113a' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.15s', marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Report Content */}
      <div ref={reportRef} style={{ background: '#f8fafc', padding: '24px', borderRadius: 20, marginBottom: 40 }}>
        {/* Watermark for PDF */}
        <div style={{ position: 'absolute', opacity: 0.03, fontSize: 120, fontWeight: 900, color: '#00113a', transform: 'rotate(-30deg)', pointerEvents: 'none', zIndex: 0 }}>
          ARTIA
        </div>

        {/* ─── GENERAL TAB ─── */}
        {activeTab === 'general' && (
          <div className="fade-in">
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
              <KPIPulseCard
                icon="💰"
                label="Total Facturado"
                value={fmtMoney(financeData.totalFacturado)}
                sub={`${fmtMoney(financeData.totalPagado)} cobrado`}
                color="#6366f1"
                trend={financeData.totalFacturado > 0 ? Math.round((financeData.totalPagado / financeData.totalFacturado) * 100) : 0}
              />
              <KPIPulseCard
                icon="⏳"
                label="Pendiente por Cobrar"
                value={fmtMoney(financeData.totalPendiente)}
                sub={`${fmtMoney(financeData.totalVencido)} vencido`}
                color="#f59e0b"
                trend={financeData.totalPendiente > 0 ? Math.round((financeData.totalVencido / financeData.totalPendiente) * 100) : 0}
              />
              <KPIPulseCard
                icon="👥"
                label="Nuevos Leads"
                value={String(leadsData.total)}
                sub={`Valor estimado: ${fmtMoney(leadsData.totalValue)}`}
                color="#10b981"
              />
              <KPIPulseCard
                icon="📁"
                label="Proyectos Activos"
                value={String(projectsData.total)}
                sub={`${projectsData.byStatus.find(s => s.name === 'Activo')?.value || 0} en curso`}
                color="#3b82f6"
              />
              <KPIPulseCard
                icon="✉️"
                label="Emails Enviados"
                value={String(emailData.total)}
                sub={`${emailData.rate}% tasa de apertura`}
                color="#ec4899"
              />
              <KPIPulseCard
                icon="👁️"
                label="Pageviews (7d)"
                value={posthog ? posthog.pageviews.toLocaleString() : '—'}
                sub="PostHog Analytics"
                color="#f97316"
              />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Ingresos Mensuales" subtitle="Facturado vs Pagado vs Pendiente">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={financeData.monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorFact" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="facturado" stroke="#6366f1" fill="url(#colorFact)" strokeWidth={2} name="Facturado" />
                    <Area type="monotone" dataKey="pagado" stroke="#10b981" fill="url(#colorPag)" strokeWidth={2} name="Pagado" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Estado de Pagos" subtitle="Distribución de contratos">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={financeData.statusCounts}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {financeData.statusCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Leads por Estado" subtitle="Pipeline actual">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={leadsData.byStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Leads">
                      {leadsData.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Proyectos por Estado" subtitle="Distribución actual">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={projectsData.byStatus}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="Proyectos" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ─── FINANZAS TAB ─── */}
        {activeTab === 'finanzas' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Facturado" value={fmtMoney(financeData.totalFacturado)} icon="💵" color="#6366f1" />
              <StatCard label="Total Pagado" value={fmtMoney(financeData.totalPagado)} icon="✅" color="#10b981" />
              <StatCard label="Pendiente" value={fmtMoney(financeData.totalPendiente)} icon="⏳" color="#f59e0b" />
              <StatCard label="Vencido" value={fmtMoney(financeData.totalVencido)} icon="⚠️" color="#ef4444" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Evolución de Ingresos" subtitle="Últimos 12 meses">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={financeData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="facturado" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="Facturado" />
                    <Line type="monotone" dataKey="pagado" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} name="Pagado" />
                    <Line type="monotone" dataKey="pendiente" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Pendiente" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Métodos de Pago" subtitle="Distribución por monto">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={financeData.methodData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                      labelLine={false}
                      animationBegin={0}
                      animationDuration={1200}
                    >
                      {financeData.methodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.gradient[index % COLORS.gradient.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Top Contratos */}
            <ChartCard title="Top 10 Contratos por Valor" subtitle="Mayores facturaciones">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={filteredPayments
                    .sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0))
                    .slice(0, 10)
                    .map(p => ({
                      name: p.lead?.nombre?.slice(0, 15) || 'Sin nombre',
                      valor: p.contract_value || 0,
                      pagado: p.installments.filter(i => i.status === 'pagado').reduce((s, i) => s + Number(i.amount), 0),
                    }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="valor" fill="#6366f1" radius={[0, 6, 6, 0]} name="Contrato" />
                  <Bar dataKey="pagado" fill="#10b981" radius={[0, 6, 6, 0]} name="Pagado" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ─── LEADS TAB ─── */}
        {activeTab === 'leads' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Leads" value={String(leadsData.total)} icon="👥" color="#6366f1" />
              <StatCard label="Valor Estimado" value={fmtMoney(leadsData.totalValue)} icon="💎" color="#8b5cf6" />
              <StatCard label="Tasa Conversión" value={`${leadsData.byStatus.find(s => s.name === 'Cerrado')?.value || 0}%`} icon="🎯" color="#10b981" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Leads por Estado" subtitle="Distribución del pipeline">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadsData.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {leadsData.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Servicios" subtitle="Leads por tipo de servicio">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leadsData.byService}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Evolución de Leads" subtitle="Nuevos leads por mes">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={leadsData.monthlyLeads}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="leads" stroke="#6366f1" fill="url(#colorLeads)" strokeWidth={3} name="Leads" />
                  <Area type="monotone" dataKey="valor" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="Valor Est." />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ─── PROYECTOS TAB ─── */}
        {activeTab === 'proyectos' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Proyectos" value={String(projectsData.total)} icon="📁" color="#3b82f6" />
              <StatCard label="En Curso" value={String(projectsData.byStatus.find(s => s.name === 'Activo')?.value || 0)} icon="🚀" color="#10b981" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Proyectos por Estado" subtitle="Distribución actual">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectsData.byStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {projectsData.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Proyectos por Mes" subtitle="Creación mensual">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectsData.monthlyProjects}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="proyectos" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Proyectos" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === 'analytics' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard
                label="Pageviews (7d)"
                value={posthog ? posthog.pageviews.toLocaleString() : 'N/A'}
                icon="👁️"
                color="#f97316"
              />
              <StatCard
                label="Issues Sentry"
                value={sentry ? String(sentry.unresolvedCount) : 'N/A'}
                icon="🐛"
                color="#ef4444"
              />
            </div>

            {posthog && posthog.daily.length > 0 && (
              <ChartCard title="Trafico Web — Últimos 7 días" subtitle="Pageviews diarios">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={posthog.daily}>
                    <defs>
                      <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#f97316" fill="url(#colorTraffic)" strokeWidth={3} name="Pageviews" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {sentry && sentry.issues.length > 0 && (
              <ChartCard title="Issues por Severidad" subtitle="Sentry Monitoring">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={sentry.issues.map(i => ({ name: i.level, count: parseInt(i.count) || 0, color: i.level === 'fatal' ? '#dc2626' : i.level === 'error' ? '#ea580c' : i.level === 'warning' ? '#d97706' : '#64748b' }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Issues">
                      {sentry.issues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.level === 'fatal' ? '#dc2626' : entry.level === 'error' ? '#ea580c' : entry.level === 'warning' ? '#d97706' : '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            Reporte generado el {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style={{ fontSize: 11, color: '#cbd5e1', margin: '4px 0 0' }}>
            Artia Studio CRM · artiaagency.vercel.app
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────

function KPIPulseCard({ icon, label, value, sub, color, trend }: {
  icon: string; label: string; value: string; sub: string; color: string; trend?: number
}) {
  return (
    <div className="kpi-pulse" style={{
      background: '#fff', borderRadius: 16, padding: '20px',
      border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="pulse-ring" style={{ '--pulse-color': color } as any} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}15`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            color: trend > 50 ? '#10b981' : '#f59e0b',
            background: trend > 50 ? '#f0fdf4' : '#fef3c7',
            padding: '4px 10px', borderRadius: 20,
          }}>
            {trend}%
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, letterSpacing: '-0.5px', position: 'relative', zIndex: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginTop: 4, position: 'relative', zIndex: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6, position: 'relative', zIndex: 1 }}>
        {sub}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: string; color: string
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}12`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color, letterSpacing: '-0.5px' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 24px',
      border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
          {title}
        </h3>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  )
}

const ANIMATIONS = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in {
    animation: fadeIn 0.4s ease-out;
  }
  @keyframes pulseRing {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  .pulse-ring::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 20px;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--pulse-color);
    animation: pulseRing 2s ease-out infinite;
    z-index: 0;
  }
  @media (max-width: 768px) {
    .kpi-pulse { padding: 16px !important; }
  }
`