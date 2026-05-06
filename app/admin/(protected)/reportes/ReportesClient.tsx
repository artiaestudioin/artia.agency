'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'

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

// FIX: LandingStats desde la view (no landing_pages)
type Landing = {
  id: string
  name: string
  slug: string
  status: string | null
  created_at: string
  views_count: number
  clicks_count: number
  conversions_count: number
  conversion_rate: number
  revenue_total: number
  orders_count: number
  total_orders: number
  pending_order: number
  paid_orders: number
}

// FIX: Order usa 'total' (no 'amount')
type Order = {
  id: string
  landing_id: string | null
  total: number | null
  status: string | null
  created_at: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  product_name: string | null
}

type UtmStat = {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  total: number | null
  status: string | null
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

function n(v: any): number {
  const p = parseFloat(String(v ?? 0))
  return isNaN(p) ? 0 : p
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v)
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

function safeDate(d: string | null | undefined): Date | null {
  if (!d) return null
  const parts = d.split('T')[0].split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function getMonthKey(d: string): string {
  const date = safeDate(d)
  if (!date) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(d: string): string {
  const date = safeDate(d)
  if (!date) return '—'
  return date.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })
}

function buildLastNMonths(n: number): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })
    result.push({ key, label })
  }
  return result
}

// ─── Component ─────────────────────────────────────────────────────

export default function ReportesClient({
  initialPayments,
  payments = initialPayments ?? [],
  leads,
  projects,
  emails,
  posthog,
  sentry,
  paymentMethods = [],
  landings = [],
  orders = [],
  utmStats = [],
}: {
  initialPayments?: PaymentParent[]
  payments?: PaymentParent[]
  leads: Lead[]
  projects: Project[]
  emails: EmailSend[]
  posthog: PhData | null
  sentry: SentryData | null
  paymentMethods?: any[]
  landings?: Landing[]
  orders?: Order[]
  utmStats?: UtmStat[]
}) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'general' | 'finanzas' | 'ventas' | 'leads' | 'proyectos' | 'analytics'>('general')
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

  const filteredPayments = payments.filter(p => {
    const d = safeDate(p.created_at)
    if (d && d >= cutoffDate) return true
    return p.installments.some(i => { const id = safeDate(i.payment_date); return id !== null && id >= cutoffDate })
  })
  const filteredLeads    = leads.filter(l    => { const d = safeDate(l.created_at); return d ? d >= cutoffDate : false })
  const filteredProjects = projects.filter(p => { const d = safeDate(p.created_at); return d ? d >= cutoffDate : false })
  const filteredEmails   = emails.filter(e   => { const d = safeDate(e.sent_at);    return d ? d >= cutoffDate : false })
  const filteredOrders   = orders.filter(o   => { const d = safeDate(o.created_at); return d ? d >= cutoffDate : false })
  const filteredLandings = landings.filter(l => { const d = safeDate(l.created_at); return d ? d >= cutoffDate : false })

  // ── Computed Data ──
  const methodData = useMemo(() => {
    const methodMap = new Map<string, number>()
    if (paymentMethods && Array.isArray(paymentMethods)) {
      paymentMethods.forEach((p: any) => {
        const raw = p.method?.trim().toLowerCase() || 'otro';
        const method = raw.charAt(0).toUpperCase() + raw.slice(1);
        methodMap.set(method, (methodMap.get(method) || 0) + 1)
      })
    }
    return Array.from(methodMap.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS.gradient[idx % COLORS.gradient.length],
    }))
  }, [paymentMethods])

  const financeData = useMemo(() => {
    const totalFacturado = filteredPayments.reduce((s, p) => s + n(p.contract_value), 0)
    const totalPagado = filteredPayments.reduce((s, p) =>
      s + p.installments.filter(i => i.status?.toLowerCase() === 'pagado').reduce((sum, i) => sum + n(i.amount), 0), 0)
    const totalPendiente = totalFacturado - totalPagado
    const totalVencido = filteredPayments.reduce((s, p) =>
      s + p.installments.filter(i => i.status?.toLowerCase() === 'vencido').reduce((sum, i) => sum + n(i.amount), 0), 0)

    const monthlyMap = new Map<string, { month: string; facturado: number; pagado: number; pendiente: number }>()
    filteredPayments.forEach(p => {
      const key   = getMonthKey(p.created_at)
      const label = getMonthLabel(p.created_at)
      if (key === 'unknown') return
      const existing = monthlyMap.get(key) || { month: label, facturado: 0, pagado: 0, pendiente: 0 }
      existing.facturado += n(p.contract_value)
      existing.pagado += p.installments.filter(i => i.status?.toLowerCase() === 'pagado').reduce((sum, i) => sum + n(i.amount), 0)
      existing.pendiente += p.installments.filter(i => i.status?.toLowerCase() !== 'pagado').reduce((sum, i) => sum + n(i.amount), 0)
      monthlyMap.set(key, existing)
    })
    const monthlyRevenue = buildLastNMonths(6).map(({ key, label }) =>
      monthlyMap.get(key) || { month: label, facturado: 0, pagado: 0, pendiente: 0 }
    )

    const statusCounts = [
      { name: 'Pagado', value: filteredPayments.filter(p => p.installments.length > 0 && p.installments.every(i => i.status?.toLowerCase() === 'pagado')).length, color: '#10b981' },
      { name: 'En progreso', value: filteredPayments.filter(p => p.installments.some(i => i.status?.toLowerCase() === 'pendiente')).length, color: '#f59e0b' },
      { name: 'Con vencidas', value: filteredPayments.filter(p => p.installments.some(i => i.status?.toLowerCase() === 'vencido')).length, color: '#ef4444' },
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

    const monthlyMap = new Map<string, { month: string; leads: number; valor: number }>()
    filteredLeads.forEach(l => {
      const key = getMonthKey(l.created_at)
      const label = getMonthLabel(l.created_at)
      const existing = monthlyMap.get(key) || { month: label, leads: 0, valor: 0 }
      existing.leads += 1
      existing.valor += n(l.estimated_value)
      monthlyMap.set(key, existing)
    })
    const monthlyLeads = buildLastNMonths(6).map(({ key, label }) =>
      monthlyMap.get(key) || { month: label, leads: 0, valor: 0 }
    )

    return { byStatus, byService, monthlyLeads, total: filteredLeads.length, totalValue: filteredLeads.reduce((s, l) => s + n(l.estimated_value), 0) }
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
    const monthlyProjects = buildLastNMonths(6).map(({ key, label }) =>
      monthlyMap.get(key) || { month: label, proyectos: 0 }
    )

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

  // ── VENTAS / LANDINGS (CORREGIDO) ─────────────────────────────────
  const salesData = useMemo(() => {
    const totalLandings   = filteredLandings.length
    const activeLandings  = filteredLandings.filter(l => l.status === 'active').length
    const totalOrders     = filteredOrders.length
    // FIX: Usar 'total' (no 'amount')
    const totalRevenue    = filteredOrders
      .filter(o => o.status === 'delivered' || o.status === 'confirmed' || o.status === 'paid')
      .reduce((s, o) => s + (o.total || 0), 0)
    const avgOrder        = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Conversión real: orders / landings (evitar división por cero)
    const conversionRate  = totalLandings > 0 && totalOrders > 0 
      ? ((totalOrders / totalLandings) * 100) 
      : 0

    // Orders by month (usando 'total')
    const ordByMonth: Record<string, number> = {}
    buildLastNMonths(6).forEach(({ key }) => { ordByMonth[key] = 0 })
    filteredOrders.forEach(o => {
      const k = getMonthKey(o.created_at)
      if (k in ordByMonth) ordByMonth[k] += o.total || 0
    })
    const ordersChart = buildLastNMonths(6).map(({ key, label }) => ({ 
      label, 
      value: ordByMonth[key] || 0,
      orders: filteredOrders.filter(o => getMonthKey(o.created_at) === key).length
    }))

    // Landings by month
    const pgByMonth: Record<string, number> = {}
    buildLastNMonths(6).forEach(({ key }) => { pgByMonth[key] = 0 })
    filteredLandings.forEach(l => {
      const k = getMonthKey(l.created_at)
      if (k in pgByMonth) pgByMonth[k]++
    })
    const landingsChart = buildLastNMonths(6).map(({ key, label }) => ({ 
      label, 
      value: pgByMonth[key] || 0 
    }))

    // Top landings por revenue
    const topLandings = filteredLandings
      .sort((a, b) => (b.revenue_total || 0) - (a.revenue_total || 0))
      .slice(0, 5)
      .map(l => ({
        name: l.name?.slice(0, 20) || 'Sin nombre',
        revenue: l.revenue_total || 0,
        orders: l.total_orders || 0,
        conversion: l.conversion_rate || 0,
      }))

    return { 
      totalLandings, 
      activeLandings, 
      totalOrders, 
      totalRevenue, 
      avgOrder, 
      conversionRate, 
      ordersChart, 
      landingsChart,
      topLandings
    }
  }, [filteredLandings, filteredOrders])

  // ── UTM DATA (NUEVO) ──────────────────────────────────────────────
  const utmData = useMemo(() => {
    // Agrupar por source
    const sourceMap = new Map<string, { revenue: number; orders: number }>()
    // Agrupar por campaign
    const campaignMap = new Map<string, { revenue: number; orders: number }>()
    
    utmStats.forEach(u => {
      const source = u.utm_source || 'direct'
      const campaign = u.utm_campaign || 'none'
      
      // Source
      const existingSource = sourceMap.get(source) || { revenue: 0, orders: 0 }
      existingSource.revenue += u.total || 0
      existingSource.orders += 1
      sourceMap.set(source, existingSource)
      
      // Campaign
      const existingCampaign = campaignMap.get(campaign) || { revenue: 0, orders: 0 }
      existingCampaign.revenue += u.total || 0
      existingCampaign.orders += 1
      campaignMap.set(campaign, existingCampaign)
    })

    const bySource = Array.from(sourceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)

    const byCampaign = Array.from(campaignMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)

    return { bySource, byCampaign }
  }, [utmStats])

  /// ─── Export PDF — ESTRATEGIA ROBUSTA CON FONDOS FORZADOS ──
async function exportPDF() {
  if (!reportRef.current) return
  setExporting(true)

  const originalTab = activeTab
  const tabs: Array<'general' | 'finanzas' | 'ventas' | 'Clientes' | 'proyectos' | 'analytics'> =
    ['general', 'finanzas', 'ventas', 'Clientes', 'proyectos', 'analytics']

  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth  = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    // ─── PORTADA DEL PDF ───
    const now = new Date()
    const fechaStr = now.toLocaleDateString('es-EC', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    
    pdf.setFillColor(0, 17, 58)
    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ARTIA', pdfWidth / 2, 80, { align: 'center' })
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Studio CRM — Reporte Ejecutivo', pdfWidth / 2, 95, { align: 'center' })
    
    pdf.setDrawColor(99, 102, 241)
    pdf.setLineWidth(1.5)
    pdf.line(pdfWidth / 2 - 40, 105, pdfWidth / 2 + 40, 105)
    
    pdf.setFontSize(22)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Reporte de Rendimiento', pdfWidth / 2, 130, { align: 'center' })
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(148, 163, 184)
    const descLines = pdf.splitTextToSize(
      'Este documento presenta un análisis completo de las métricas clave del negocio incluyendo finanzas, Clientes, proyectos y analytics. Los datos reflejan el estado actual del pipeline comercial y la salud financiera de la agencia.',
      pdfWidth - 60
    )
    pdf.text(descLines, pdfWidth / 2, 145, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text(`Generado el ${fechaStr}`, pdfWidth / 2, 185, { align: 'center' })
    
    const periodoLabel = {
      '7d': 'Últimos 7 días',
      '30d': 'Últimos 30 días',
      '90d': 'Últimos 90 días',
      '1y': 'Último año',
      'all': 'Histórico completo'
    }[dateRange]
    
    pdf.setFontSize(10)
    pdf.setTextColor(148, 163, 184)
    pdf.text(`Período analizado: ${periodoLabel}`, pdfWidth / 2, 195, { align: 'center' })
    
    pdf.setFontSize(9)
    pdf.text('artiaagency.vercel.app', pdfWidth / 2, 270, { align: 'center' })
    
    let firstPage = false

    for (const tab of tabs) {
      setActiveTab(tab)
      // Esperar más tiempo para que Recharts renderice completamente
      await new Promise(r => setTimeout(r, 1200))

      if (!reportRef.current) continue
      
      // ─── CAPTURA ROBUSTA CON CLONADO Y ESTILOS FORZADOS ───
      const el = reportRef.current
      
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1400,
        scrollX: 0,
        scrollY: -window.scrollY,
        // CLAVE: Modificar el DOM clonado antes de capturar
        onclone: (clonedDoc, clonedEl) => {
          // 1. Forzar fondo blanco en el contenedor principal
          clonedEl.style.backgroundColor = '#ffffff !important'
          clonedEl.style.background = '#ffffff !important'
          
          // 2. Aplicar fondos blancos a TODAS las tarjetas internas
          const allCards = clonedEl.querySelectorAll('[style*="background"]')
          allCards.forEach((card: any) => {
            // Si tiene transparencia o gradiente, forzar blanco sólido
            const currentBg = window.getComputedStyle(card).backgroundColor
            if (currentBg.includes('0)') || currentBg === 'rgba(0, 0, 0, 0)' || currentBg === 'transparent') {
              card.style.backgroundColor = '#ffffff'
            }
          })
          
          // 3. Forzar fondo blanco en todos los divs que no tengan fondo explícito
          const allDivs = clonedEl.querySelectorAll('div')
          allDivs.forEach((div: any) => {
            const computed = window.getComputedStyle(div)
            if (computed.backgroundColor === 'rgba(0, 0, 0, 0)' || computed.backgroundColor === 'transparent') {
              // Solo si no es un elemento de gráfico de Recharts
              if (!div.closest('.recharts-wrapper') && !div.querySelector('svg')) {
                div.style.backgroundColor = '#ffffff'
              }
            }
          })
          
          // 4. Asegurar que los textos tengan color oscuro visible
          const allText = clonedEl.querySelectorAll('span, p, h1, h2, h3, h4, div')
          allText.forEach((text: any) => {
            const computed = window.getComputedStyle(text)
            const color = computed.color
            // Si el color es muy claro o transparente, forzar oscuro
            if (color.includes('0)') || color.includes('rgba(0')) {
              text.style.color = '#0f172a'
            }
          })
          
          // 5. Desactivar cualquier animación CSS en el clon
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * { animation: none !important; transition: none !important; }
            .recharts-surface { overflow: visible !important; }
            .recharts-wrapper { background: #ffffff !important; }
          `
          clonedDoc.head.appendChild(style)
        }
      })

      const imgW      = canvas.width
      const imgH      = canvas.height
      const ratio     = pdfWidth / imgW
      const renderedH = imgH * ratio
      let   remaining = renderedH
      let   srcY      = 0

      while (remaining > 0) {
        if (!firstPage) {
          pdf.addPage()
        }
        firstPage = false

        const sliceH      = Math.min(pdfHeight, remaining)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width  = imgW
        sliceCanvas.height = Math.ceil(sliceH / ratio)
        const ctx = sliceCanvas.getContext('2d')!
        
        // Fondo blanco sólido
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(canvas, 0, srcY / ratio, imgW, sliceCanvas.height, 0, 0, imgW, sliceCanvas.height)
        
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, sliceH)

        srcY      += sliceCanvas.height
        remaining -= pdfHeight
      }
    }

    pdf.save(`reporte-artia-${now.toISOString().slice(0, 10)}.pdf`)
  } catch (err) {
    console.error('Error exportando PDF:', err)
    alert('Error al generar PDF. Asegúrate de que CORS esté habilitado.')
  } finally {
    setActiveTab(originalTab)
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
              {exporting ? '⏳ Exportando todas las tabs…' : '📄 Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 20, borderBottom: '2px solid #f1f5f9', paddingBottom: 2 }}>
          {[
            { key: 'general', label: '📈 General' },
            { key: 'finanzas', label: '💰 Finanzas' },
            { key: 'ventas', label: '🛍 Ventas' },
            { key: 'leads', label: '👥 Leads' },
            { key: 'proyectos', label: '📁 Proyectos' },
            { key: 'analytics', label: '📡 Analytics' },
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
      <div ref={reportRef} style={{ background: '#ffffff', padding: '24px', borderRadius: 20, marginBottom: 40 }}>
        {/* Watermark for PDF */}
        <div style={{ position: 'absolute', opacity: 0.03, fontSize: 120, fontWeight: 900, color: '#00113a', transform: 'rotate(-30deg)', pointerEvents: 'none', zIndex: 0 }}>
          ARTIA
        </div>
        
        {/* ─── GENERAL TAB ─── */}
        {activeTab === 'general' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
              <KPIPulseCard icon="💰" label="Total Facturado" value={fmtMoney(financeData.totalFacturado)} sub={`${fmtMoney(financeData.totalPagado)} cobrado`} color="#6366f1" trend={financeData.totalFacturado > 0 ? Math.round((financeData.totalPagado / financeData.totalFacturado) * 100) : 0} />
              <KPIPulseCard icon="⏳" label="Pendiente por Cobrar" value={fmtMoney(financeData.totalPendiente)} sub={`${fmtMoney(financeData.totalVencido)} vencido`} color="#f59e0b" trend={financeData.totalPendiente > 0 ? Math.round((financeData.totalVencido / financeData.totalPendiente) * 100) : 0} />
              <KPIPulseCard icon="👥" label="Nuevos Clientes" value={String(leadsData.total)} sub={`Valor estimado: ${fmtMoney(leadsData.totalValue)}`} color="#10b981" />
              <KPIPulseCard icon="📁" label="Proyectos Activos" value={String(projectsData.total)} sub={`${projectsData.byStatus.find(s => s.name === 'Activo')?.value || 0} en curso`} color="#3b82f6" />
              <KPIPulseCard icon="🛍" label="Ventas Landings" value={fmtMoney(salesData.totalRevenue)} sub={`${salesData.totalOrders} pedidos`} color="#ec4899" />
            </div>

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
        {/* 👇 Gradiente nuevo para pendiente */}
        <linearGradient id="colorPend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Area type="monotone" dataKey="facturado" stroke="#6366f1" fill="url(#colorFact)" strokeWidth={2} name="Facturado" />
      <Area type="monotone" dataKey="pagado" stroke="#10b981" fill="url(#colorPag)" strokeWidth={2} name="Pagado" />
      {/* 👇 Área nueva para pendiente, con línea punteada igual que en LineChart */}
      <Area type="monotone" dataKey="pendiente" stroke="#f59e0b" fill="url(#colorPend)" strokeWidth={2} strokeDasharray="5 5" name="Pendiente" />
    </AreaChart>
  </ResponsiveContainer>
</ChartCard>

              <ChartCard title="Estado de Pagos" subtitle="Distribución de contratos">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={financeData.statusCounts} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
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

            <ChartCard title="Evolución de Ingresos" subtitle="Últimos 12 meses">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={financeData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="facturado" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} name="Facturado" />
                  <Line type="monotone" dataKey="pagado" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="Pagado" />
                  <Line type="monotone" dataKey="pendiente" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Pendiente" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ─── VENTAS TAB (CORREGIDO) ─── */}
        {activeTab === 'ventas' && (
          <div className="fade-in">
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard label="Landings Activas" value={String(salesData.activeLandings)} icon="📄" color="#7c3aed" />
              <StatCard label="Total Landings" value={String(salesData.totalLandings)} icon="🎯" color="#6366f1" />
              <StatCard label="Pedidos Totales" value={String(salesData.totalOrders)} icon="📦" color="#3b82f6" />
              <StatCard label="Ingresos Ventas" value={fmtMoney(salesData.totalRevenue)} icon="💵" color="#10b981" />
              <StatCard label="Ticket Promedio" value={fmtMoney(salesData.avgOrder)} icon="🛒" color="#f59e0b" />
              <StatCard label="Conversión" value={`${salesData.conversionRate.toFixed(1)}%`} icon="📊" color="#ec4899" />
            </div>

            {/* Gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Ingresos por Pedidos" subtitle="Monto acumulado por mes">
                {salesData.totalOrders === 0 ? (
                  <EmptyState 
                    icon="📭" 
                    title="Sin pedidos registrados" 
                    action={{ label: 'Ir a Pedidos', href: '/admin/landings/orders' }}
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salesData.ordersChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Landings Creadas" subtitle="Nuevas landing pages por mes">
                {salesData.totalLandings === 0 ? (
                  <EmptyState 
                    icon="📭" 
                    title="Sin landings registradas" 
                    action={{ label: 'Crear Landing', href: '/admin/landings/nuevo' }}
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salesData.landingsChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Landings" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Top Landings */}
            <ChartCard title="Top 5 Landings por Revenue" subtitle="Mejor rendimiento">
              {salesData.topLandings.length === 0 ? (
                <EmptyState icon="📊" title="Sin datos de landings" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesData.topLandings} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} name="Revenue" />
                    <Bar dataKey="orders" fill="#6366f1" radius={[0, 6, 6, 0]} name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* UTM Performance */}
            {utmData.bySource.length > 0 && (
              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <ChartCard title="Performance por UTM Source" subtitle="Ingresos por fuente de tráfico">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={utmData.bySource}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Performance por Campaña" subtitle="Ingresos por campaña UTM">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={utmData.byCampaign}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-15} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#ec4899" radius={[6, 6, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {/* Links corregidos */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              {[
                // FIX: Rutas corregidas de /admin/ventas/... a /admin/landings/...
                { href: '/admin/landings', label: '📄 Landings' },
                { href: '/admin/landings/orders', label: '📦 Pedidos' },
                { href: '/admin/landings/nuevo', label: '➕ Nueva Landing' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, 
                    padding: '8px 16px', background: '#f8fafc', 
                    border: '1px solid #e2e8f0', borderRadius: 8, 
                    fontSize: 12, fontWeight: 600, color: '#0f172a', 
                    textDecoration: 'none', transition: 'all 0.15s' 
                  }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── LEADS TAB ─── */}
        {activeTab === 'leads' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total de Clientes" value={String(leadsData.total)} icon="👥" color="#6366f1" />
              <StatCard label="Valor Estimado" value={fmtMoney(leadsData.totalValue)} icon="💎" color="#8b5cf6" />
              <StatCard label="Tasa Conversión" value={`${leadsData.byStatus.find(s => s.name === 'Cerrado')?.value || 0}%`} icon="🎯" color="#10b981" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Estado de Clientes" subtitle="Distribución global de estados">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={leadsData.byStatus} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                      {leadsData.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Servicios" subtitle="Clientes por tipo de servicio">
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

            <ChartCard title="Evolución de Clientes" subtitle="Nuevos Clientes por mes">
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
                <div style={{ padding: '16px 0' }}>
                  {projectsData.byStatus.length === 0 ? (
                    <EmptyState icon="📭" title="Sin proyectos en este período" />
                  ) : (
                    (() => {
                      const total = projectsData.byStatus.reduce((s, x) => s + x.value, 0)
                      return (
                        <>
                          <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', marginBottom: 24, gap: 2 }}>
                            {projectsData.byStatus.map((entry, i) => (
                              <div key={i} style={{ flex: entry.value, background: entry.color, minWidth: entry.value > 0 ? 4 : 0 }} />
                            ))}
                          </div>
                          {projectsData.byStatus.map((entry, i) => (
                            <div key={i} style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: entry.color }} />
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{entry.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{total > 0 ? Math.round((entry.value / total) * 100) : 0}%</span>
                                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', background: entry.color, padding: '3px 12px', borderRadius: 20 }}>{entry.value}</span>
                                </div>
                              </div>
                              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 99, width: `${total > 0 ? (entry.value / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${entry.color}cc, ${entry.color})` }} />
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>TOTAL PROYECTOS</span>
                            <span style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{total}</span>
                          </div>
                        </>
                      )
                    })()
                  )}
                </div>
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
              <StatCard label="Pageviews (7d)" value={posthog ? posthog.pageviews.toLocaleString() : 'N/A'} icon="👁️" color="#f97316" />
              <StatCard label="Issues Sentry" value={sentry ? String(sentry.unresolvedCount) : 'N/A'} icon="🐛" color="#ef4444" />
            </div>

            {posthog && posthog.daily.length > 0 && (
              <ChartCard title="Tráfico Web — Últimos 7 días" subtitle="Pageviews diarios">
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
                  <BarChart data={sentry.issues.map(i => ({ 
                    name: i.level, 
                    count: parseInt(i.count) || 0,
                    color: i.level === 'fatal' ? '#dc2626' : i.level === 'error' ? '#ea580c' : i.level === 'warning' ? '#d97706' : '#64748b' 
                  }))}>
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
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: trend > 50 ? '#10b981' : '#f59e0b', background: trend > 50 ? '#f0fdf4' : '#fef3c7', padding: '4px 10px', borderRadius: 20 }}>
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
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
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
    borderRadius: 12px;
    background: var(--pulse-color);
    animation: pulseRing 2s ease-out infinite;
    z-index: 0;
  }
  @media (max-width: 768px) {
    .kpi-pulse { padding: 16px !important; }
  }
`