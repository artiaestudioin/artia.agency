// lib/pdf-generator.ts
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Types ─────────────────────────────────────────────────────────

export interface PDFPayload {
  month: string
  period: string
  generated_at: string
  summary?: {
    health_score: number
    total_leads: number
    total_projects: number
    total_orders: number
    total_revenue: number
    total_facturado: number
    total_cobrado: number
  }
  finanzas: FinanzasSection
  ventas: VentasSection
  leads: LeadsSection
  proyectos: ProyectosSection
  analytics: AnalyticsSection
}

interface FinanzasSection {
  total_facturado: number
  total_cobrado: number
  pendiente_al_dia: number
  vencido: number
  total_pendiente: number
  cartera_sana_pct: number
  cobranza_rate: number
  contratos: { pagados: number; en_progreso: number; con_vencidas: number; total: number }
  metodos_pago: { name: string; count: number }[]
  evolucion_mensual: MonthlyFinanceItem[]
}

interface VentasSection {
  total_orders: number
  ingresos: number
  ticket_promedio: number
  conversion_rate: number
  ctr_promedio: number
  landings: { total: number; activas: number; inactivas: number }
  top_landings: { name: string; revenue: number; orders: number; conversion: number; ctr: number; views: number }[]
  orders_por_mes: MonthlySalesItem[]
  landings_por_mes: MonthlyCountItem[]
}

interface LeadsSection {
  nuevos: number
  convertidos: number
  conversion_rate: number
  valor_estimado_total: number
  por_estado: StatusItem[]
  por_servicio: ServiceItem[]
  evolucion_mensual: MonthlyLeadsItem[]
  cohorte: CohortData
}

interface ProyectosSection {
  total: number
  activos: number
  completados: number
  en_curso: number
  lead_time_promedio_dias: number
  proyectos_con_fecha: number
  por_estado: StatusItem[]
  evolucion_mensual: MonthlyCountItem[]
}

interface AnalyticsSection {
  visitas_7d: number | null
  visitas_diarias: { label: string; value: number }[]
  issues_sentry: number | null
  events_24h: number | null
  conversion_funnel: { visitas: number | null; clicks: number | null; conversiones: number | null }
}

interface MonthlyItem {
  label?: string
  value?: number
  month?: string
  proyectos?: number
  leads?: number
  valor?: number
  facturado?: number
  pagado?: number
  pendiente?: number
  vencido?: number
  revenue?: number
  orders?: number
  paid_orders?: number
}

interface StatusItem {
  name: string
  value: number
  color?: string
}

interface ServiceItem {
  name: string
  value: number
}

interface CohortData {
  total_leads: number
  con_proyecto: number
  con_pago: number
  conversion_lead_a_proyecto_pct: number
  conversion_proyecto_a_pago_pct: number
  dias_promedio_lead_a_proyecto: number
  funnel_drop_pct: number
}

// ─── Color Palette ─────────────────────────────────────────────────

const COLORS = {
  primary:   ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#818cf8'],
  success:   ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  warning:   ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  danger:    ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  info:      ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  neutral:   ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'],
  chart:     {
    blue:   '#6366f1',
    green:  '#10b981',
    orange: '#f59e0b',
    red:    '#ef4444',
    purple: '#8b5cf6',
    pink:   '#ec4899',
    cyan:   '#06b6d4',
    slate:  '#64748b',
  }
}

const ESTADO_COLORS: Record<string, string> = {
  nuevo: '#3b82f6', contactado: '#f59e0b', en_proceso: '#8b5cf6',
  cerrado: '#10b981', perdido: '#ef4444', activo: '#10b981',
  completado: '#059669', pendiente: '#d97706', vencido: '#dc2626',
  pagado: '#10b981', 'en progreso': '#3b82f6', 'con vencidas': '#ef4444',
}

// ─── Helpers ───────────────────────────────────────────────────────

function fmtMoney(v: number): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function fmtNumber(v: number): string {
  return new Intl.NumberFormat('es-EC').format(v)
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [100, 116, 139]
}

// ─── Chart Engine (Vectorial PDF) ──────────────────────────────────

/**
 * Dibuja un pie/donut chart vectorial en el PDF
 */
function drawPieChart(
  pdf: jsPDF,
  data: { name: string; value: number; color?: string }[],
  cx: number,
  cy: number,
  radius: number,
  innerRadius: number = 0
) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return

  let currentAngle = -Math.PI / 2 // Empezar desde arriba

  data.forEach((slice) => {
    const sliceAngle = (slice.value / total) * 2 * Math.PI
    const color = slice.color || COLORS.primary[0]
    const [r, g, b] = hexToRgb(color)

    pdf.setFillColor(r, g, b)
    pdf.setDrawColor(r, g, b)

    // Dibujar sector
    const steps = Math.max(8, Math.ceil(sliceAngle / 0.05))
    const points: [number, number][] = []

    for (let i = 0; i <= steps; i++) {
      const angle = currentAngle + (sliceAngle * i) / steps
      points.push([
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius
      ])
    }

    if (innerRadius > 0) {
      // Donut: agregar arco interior en reversa
      for (let i = steps; i >= 0; i--) {
        const angle = currentAngle + (sliceAngle * i) / steps
        points.push([
          cx + Math.cos(angle) * innerRadius,
          cy + Math.sin(angle) * innerRadius
        ])
      }
    } else {
      points.push([cx, cy])
    }

    pdf.polygon(points, 'FD')

    // Separador sutil
    pdf.setDrawColor(255, 255, 255)
    pdf.setLineWidth(0.5)
    const midAngle = currentAngle + sliceAngle / 2
    pdf.line(
      cx + Math.cos(currentAngle) * (innerRadius || 0.5),
      cy + Math.sin(currentAngle) * (innerRadius || 0.5),
      cx + Math.cos(currentAngle) * radius,
      cy + Math.sin(currentAngle) * radius
    )

    currentAngle += sliceAngle
  })
}

/**
 * Dibuja un bar chart horizontal o vertical vectorial
 */
function drawBarChart(
  pdf: jsPDF,
  data: { label: string; value: number; color?: string }[],
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    horizontal?: boolean
    maxValue?: number
    barColors?: string[]
    showValues?: boolean
    valueFormatter?: (v: number) => string
  } = {}
) {
  const {
    horizontal = false,
    maxValue: forcedMax,
    barColors = COLORS.primary,
    showValues = true,
    valueFormatter = (v: number) => String(v)
  } = options

  const values = data.map(d => d.value)
  const maxValue = forcedMax || Math.max(...values, 1)
  const count = data.length

  pdf.setDrawColor(226, 232, 240) // slate-200
  pdf.setLineWidth(0.2)

  if (horizontal) {
    // Barras horizontales
    const barHeight = (height - 20) / count
    const availableWidth = width - 80 // espacio para labels

    data.forEach((item, i) => {
      const barY = y + 10 + i * barHeight
      const barWidth = (item.value / maxValue) * availableWidth
      const color = item.color || barColors[i % barColors.length]
      const [r, g, b] = hexToRgb(color)

      // Label
      pdf.setFontSize(9)
      pdf.setTextColor(100, 116, 139)
      pdf.text(item.label.substring(0, 20), x, barY + barHeight / 2 + 3)

      // Barra
      pdf.setFillColor(r, g, b)
      pdf.setDrawColor(r, g, b)
      pdf.roundedRect(x + 70, barY + 2, barWidth, barHeight - 6, 2, 2, 'FD')

      // Valor
      if (showValues) {
        pdf.setFontSize(9)
        pdf.setTextColor(15, 23, 42)
        pdf.text(valueFormatter(item.value), x + 70 + barWidth + 4, barY + barHeight / 2 + 3)
      }
    })
  } else {
    // Barras verticales
    const barWidth = Math.min((width - 30) / count - 4, 35)
    const availableHeight = height - 40
    const startX = x + (width - count * (barWidth + 4)) / 2

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const gridY = y + 10 + (availableHeight * i) / 4
      pdf.line(x + 10, gridY, x + width - 10, gridY)
    }

    data.forEach((item, i) => {
      const barX = startX + i * (barWidth + 4)
      const barHeight = (item.value / maxValue) * availableHeight
      const barY = y + 10 + availableHeight - barHeight
      const color = item.color || barColors[i % barColors.length]
      const [r, g, b] = hexToRgb(color)

      // Barra
      pdf.setFillColor(r, g, b)
      pdf.setDrawColor(r, g, b)
      pdf.roundedRect(barX, barY, barWidth, barHeight, 3, 3, 'FD')

      // Label X
      pdf.setFontSize(7)
      pdf.setTextColor(100, 116, 139)
      const label = item.label.length > 8 ? item.label.substring(0, 6) + '..' : item.label
      pdf.text(label, barX + barWidth / 2, y + 10 + availableHeight + 8, { align: 'center' })

      // Valor encima
      if (showValues && barHeight > 12) {
        pdf.setFontSize(8)
        pdf.setTextColor(255, 255, 255)
        pdf.text(valueFormatter(item.value), barX + barWidth / 2, barY + 8, { align: 'center' })
      }
    })
  }
}

/**
 * Dibuja un line/area chart vectorial
 */
function drawLineChart(
  pdf: jsPDF,
  data: { label: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    lineColor?: string
    fillColor?: string
    fillOpacity?: number
    showPoints?: boolean
    valueFormatter?: (v: number) => string
  } = {}
) {
  const {
    lineColor = COLORS.chart.blue,
    fillColor = COLORS.chart.blue,
    showPoints = true,
    valueFormatter = (v: number) => String(v)
  } = options

  if (data.length < 2) return

  const values = data.map(d => d.value)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const range = maxValue - minValue || 1

  const paddingLeft = 35
  const paddingRight = 15
  const paddingTop = 20
  const paddingBottom = 25
  const chartW = width - paddingLeft - paddingRight
  const chartH = height - paddingTop - paddingBottom

  const getX = (i: number) => x + paddingLeft + (i / (data.length - 1)) * chartW
  const getY = (v: number) => y + paddingTop + chartH - ((v - minValue) / range) * chartH

  // Grid
  pdf.setDrawColor(241, 245, 249)
  pdf.setLineWidth(0.2)
  for (let i = 0; i <= 4; i++) {
    const gridY = y + paddingTop + (chartH * i) / 4
    pdf.line(x + paddingLeft, gridY, x + width - paddingRight, gridY)
  }

  // Fill area (polígono cerrado)
  const fillRgb = hexToRgb(fillColor)
  const points: [number, number][] = []
  data.forEach((d, i) => points.push([getX(i), getY(d.value)]))
  points.push([getX(data.length - 1), y + paddingTop + chartH])
  points.push([getX(0), y + paddingTop + chartH])

  pdf.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2])
  pdf.setDrawColor(fillRgb[0], fillRgb[1], fillRgb[2])
  pdf.setLineWidth(0.1)
  pdf.polygon(points, 'F')

  // Línea
  const lineRgb = hexToRgb(lineColor)
  pdf.setDrawColor(lineRgb[0], lineRgb[1], lineRgb[2])
  pdf.setLineWidth(1.5)

  for (let i = 0; i < data.length - 1; i++) {
    pdf.line(getX(i), getY(data[i].value), getX(i + 1), getY(data[i + 1].value))
  }

  // Puntos
  if (showPoints) {
    data.forEach((d, i) => {
      const px = getX(i)
      const py = getY(d.value)
      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(lineRgb[0], lineRgb[1], lineRgb[2])
      pdf.setLineWidth(1)
      pdf.circle(px, py, 2.5, 'FD')
    })
  }

  // Labels X
  pdf.setFontSize(7)
  pdf.setTextColor(148, 163, 184)
  data.forEach((d, i) => {
    const label = d.label.length > 6 ? d.label.substring(0, 5) + '.' : d.label
    pdf.text(label, getX(i), y + height - 8, { align: 'center' })
  })

  // Labels Y (simplificados)
  pdf.setFontSize(7)
  pdf.setTextColor(148, 163, 184)
  for (let i = 0; i <= 4; i++) {
    const val = minValue + (range * (4 - i)) / 4
    const label = valueFormatter(val)
    pdf.text(label, x + paddingLeft - 5, y + paddingTop + (chartH * i) / 4 + 2, { align: 'right' })
  }
}

/**
 * Dibuja un funnel chart (pirámide invertida)
 */
function drawFunnel(
  pdf: jsPDF,
  data: { label: string; value: number; color: string }[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const stepHeight = height / data.length

  data.forEach((item, i) => {
    const ratio = item.value / maxValue
    const segmentWidth = width * ratio
    const segmentX = x + (width - segmentWidth) / 2
    const segmentY = y + i * stepHeight
    const [r, g, b] = hexToRgb(item.color)

    pdf.setFillColor(r, g, b)
    pdf.setDrawColor(r, g, b)
    pdf.roundedRect(segmentX, segmentY + 2, segmentWidth, stepHeight - 6, 4, 4, 'FD')

    // Label centrado
    pdf.setFontSize(9)
    pdf.setTextColor(255, 255, 255)
    const label = `${item.label}: ${item.value}`
    pdf.text(label, x + width / 2, segmentY + stepHeight / 2 + 3, { align: 'center' })
  })
}

/**
 * Dibuja una barra de progreso horizontal
 */
function drawProgressBar(
  pdf: jsPDF,
  value: number,
  max: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  backgroundColor: string = '#f1f5f9'
) {
  const [bgR, bgG, bgB] = hexToRgb(backgroundColor)
  const [r, g, b] = hexToRgb(color)
  const pct = Math.min(value / max, 1)

  // Fondo
  pdf.setFillColor(bgR, bgG, bgB)
  pdf.setDrawColor(bgR, bgG, bgB)
  pdf.roundedRect(x, y, width, height, height / 2, height / 2, 'FD')

  // Progreso
  if (pct > 0) {
    pdf.setFillColor(r, g, b)
    pdf.setDrawColor(r, g, b)
    pdf.roundedRect(x, y, width * pct, height, height / 2, height / 2, 'FD')
  }
}

// ─── PDF Builder ───────────────────────────────────────────────────

export async function generatePDF(
  payload: PDFPayload,
  aiContent: string | null
): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageW = pdf.internal.pageSize.getWidth()  // 210
  const pageH = pdf.internal.pageSize.getHeight()   // 297
  const margin = 16
  const contentW = pageW - margin * 2

  let y = margin

  // ═══════════════════════════════════════════════════════════════
  // PORTADA
  // ═══════════════════════════════════════════════════════════════
  pdf.setFillColor(0, 17, 58)
  pdf.rect(0, 0, pageW, pageH, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(42)
  pdf.setFont('helvetica', 'bold')
  pdf.text('ARTIA', pageW / 2, 80, { align: 'center' })

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Studio CRM — Reporte Ejecutivo', pageW / 2, 95, { align: 'center' })

  pdf.setDrawColor(99, 102, 241)
  pdf.setLineWidth(1.5)
  pdf.line(pageW / 2 - 40, 105, pageW / 2 + 40, 105)

  pdf.setFontSize(22)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Reporte de Rendimiento', pageW / 2, 130, { align: 'center' })

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(148, 163, 184)
  const desc = 'Este documento presenta un análisis completo de las métricas clave del negocio incluyendo finanzas, leads, proyectos y analytics. Los datos reflejan el estado actual del pipeline comercial y la salud financiera de la agencia.'
  const descLines = pdf.splitTextToSize(desc, contentW)
  pdf.text(descLines, pageW / 2, 145, { align: 'center' })

  const now = new Date()
  const fechaStr = now.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  pdf.setFontSize(12)
  pdf.setTextColor(255, 255, 255)
  pdf.text(`Generado el ${fechaStr}`, pageW / 2, 185, { align: 'center' })

  const periodoLabel: Record<string, string> = {
    '7d': 'Últimos 7 días', '30d': 'Últimos 30 días',
    '90d': 'Últimos 90 días', '1y': 'Último año', 'all': 'Histórico completo'
  }
  pdf.setFontSize(10)
  pdf.setTextColor(148, 163, 184)
  pdf.text(`Período analizado: ${periodoLabel[payload.period] || payload.period}`, pageW / 2, 195, { align: 'center' })

  pdf.setFontSize(9)
  pdf.text('artiaagency.vercel.app', pageW / 2, 270, { align: 'center' })

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO (KPIs)
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage()
  y = margin

  pdf.setTextColor(0, 17, 58)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Resumen Ejecutivo', margin, y)
  y += 10

  pdf.setDrawColor(99, 102, 241)
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageW - margin, y)
  y += 12

  // KPIs grid 3x2
  const kpis = [
    { label: 'Health Score', value: `${payload.summary?.health_score ?? 0}/100`, icon: '❤️', color: '#10b981' },
    { label: 'Total Leads', value: fmtNumber(payload.summary?.total_leads ?? 0), icon: '👥', color: '#6366f1' },
    { label: 'Proyectos', value: fmtNumber(payload.summary?.total_projects ?? 0), icon: '📁', color: '#3b82f6' },
    { label: 'Órdenes', value: fmtNumber(payload.summary?.total_orders ?? 0), icon: '🛍️', color: '#ec4899' },
    { label: 'Ingresos', value: fmtMoney(payload.summary?.total_revenue ?? 0), icon: '💰', color: '#10b981' },
    { label: 'Facturado', value: fmtMoney(payload.summary?.total_facturado ?? 0), icon: '📄', color: '#f59e0b' },
  ]

  const kpiW = (contentW - 16) / 3
  const kpiH = 28

  kpis.forEach((kpi, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const kpiX = margin + col * (kpiW + 8)
    const kpiY = y + row * (kpiH + 8)

    // Card bg
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(kpiX, kpiY, kpiW, kpiH, 4, 4, 'FD')

    // Color strip
    const [r, g, b] = hexToRgb(kpi.color)
    pdf.setFillColor(r, g, b)
    pdf.rect(kpiX, kpiY, 3, kpiH, 'F')

    // Label
    pdf.setFontSize(8)
    pdf.setTextColor(148, 163, 184)
    pdf.setFont('helvetica', 'bold')
    pdf.text(kpi.label.toUpperCase(), kpiX + 10, kpiY + 10)

    // Value
    pdf.setFontSize(14)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text(kpi.value, kpiX + 10, kpiY + 22)
  })

  y += 2 * (kpiH + 8) + 15

  // ═══════════════════════════════════════════════════════════════
  // ANÁLISIS IA (si existe)
  // ═══════════════════════════════════════════════════════════════
  if (aiContent) {
    pdf.setTextColor(0, 17, 58)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Análisis Inteligente — Artia AI', margin, y)
    y += 8

    pdf.setDrawColor(99, 102, 241)
    pdf.setLineWidth(0.5)
    pdf.line(margin, y, pageW - margin, y)
    y += 10

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(51, 65, 85)

    const aiLines = pdf.splitTextToSize(aiContent, contentW)
    const lineHeight = 5.5
    const maxY = pageH - margin

    for (const line of aiLines) {
      if (y > maxY - 10) {
        pdf.addPage()
        y = margin
        pdf.setFillColor(248, 250, 252)
        pdf.rect(0, 0, pageW, pageH, 'F')
      }
      pdf.text(line, margin, y)
      y += lineHeight
    }
    y += 15
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN: FINANZAS
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage()
  y = margin
  renderSectionHeader(pdf, 'Finanzas', 'Métricas de facturación, cobranza y cartera', margin, y, pageW)
  y += 22

  // Stats cards
  const finStats = [
    { label: 'Total Facturado', value: fmtMoney(payload.finanzas.total_facturado), color: '#6366f1' },
    { label: 'Total Cobrado', value: fmtMoney(payload.finanzas.total_cobrado), color: '#10b981' },
    { label: 'Pendiente al Día', value: fmtMoney(payload.finanzas.pendiente_al_dia), color: '#3b82f6' },
    { label: 'Vencido', value: fmtMoney(payload.finanzas.vencido), color: '#ef4444' },
  ]
  y = renderStatsRow(pdf, finStats, margin, y, contentW)
  y += 12

  // Cartera sana progress bar
  pdf.setFontSize(11)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Salud de Cartera: ${payload.finanzas.cartera_sana_pct}%`, margin, y)
  y += 6
  drawProgressBar(pdf, payload.finanzas.cartera_sana_pct, 100, margin, y, contentW, 8,
    payload.finanzas.cartera_sana_pct > 80 ? '#10b981' : payload.finanzas.cartera_sana_pct > 50 ? '#f59e0b' : '#ef4444'
  )
  y += 18

  // Contratos donut chart
  const contratosData = [
    { name: 'Pagados', value: payload.finanzas.contratos.pagados, color: '#10b981' },
    { name: 'En Progreso', value: payload.finanzas.contratos.en_progreso, color: '#3b82f6' },
    { name: 'Con Vencidas', value: payload.finanzas.contratos.con_vencidas, color: '#ef4444' },
  ]

  if (contratosData.some(d => d.value > 0)) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Distribución de Contratos', margin, y)
    y += 8

    drawPieChart(pdf, contratosData, margin + 45, y + 35, 30, 18)
    y += 80

    // Leyenda
    contratosData.forEach((d, i) => {
      const [r, g, b] = hexToRgb(d.color)
      pdf.setFillColor(r, g, b)
      pdf.rect(margin + 100, y - 75 + i * 10, 5, 5, 'F')
      pdf.setFontSize(9)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`${d.name}: ${d.value}`, margin + 110, y - 71 + i * 10)
    })
  }

  // Evolución mensual line chart
  if (payload.finanzas.evolucion_mensual?.length > 0) {
    pdf.addPage()
    y = margin
    renderSectionHeader(pdf, 'Evolución Financiera Mensual', 'Tendencia de facturación, cobranza y vencidos', margin, y, pageW)
    y += 22

    // Tabla de datos
    const tableData = payload.finanzas.evolucion_mensual.map(m => [
      m.month,
      fmtMoney(m.facturado),
      fmtMoney(m.pagado),
      fmtMoney(m.pendiente),
      fmtMoney(m.vencido),
    ])

    autoTable(pdf, {
      startY: y,
      head: [['Mes', 'Facturado', 'Cobrado', 'Pendiente', 'Vencido']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
    })

    y = (pdf as any).lastAutoTable.finalY + 15

    // Chart visual
    if (y < pageH - 100) {
      pdf.setFontSize(11)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Visualización:', margin, y)
      y += 8

      const chartData = payload.finanzas.evolucion_mensual.map(m => ({
        label: m.month.substring(0, 6),
        value: m.facturado
      }))
      drawLineChart(pdf, chartData, margin, y, contentW, 70, {
        lineColor: '#6366f1',
        fillColor: '#6366f1',
        valueFormatter: (v) => `$${(v / 1000).toFixed(0)}k`
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN: VENTAS
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage()
  y = margin
  renderSectionHeader(pdf, 'Ventas & Landings', 'Performance de landing pages y pedidos', margin, y, pageW)
  y += 22

  const ventasStats = [
    { label: 'Total Órdenes', value: fmtNumber(payload.ventas.total_orders), color: '#6366f1' },
    { label: 'Ingresos', value: fmtMoney(payload.ventas.ingresos), color: '#10b981' },
    { label: 'Ticket Promedio', value: fmtMoney(payload.ventas.ticket_promedio), color: '#f59e0b' },
    { label: 'Conversión', value: `${payload.ventas.conversion_rate}%`, color: '#ec4899' },
  ]
  y = renderStatsRow(pdf, ventasStats, margin, y, contentW)
  y += 15

  // Landings status
  pdf.setFontSize(11)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Landings:', margin, y)
  y += 6
  drawProgressBar(pdf, payload.ventas.landings.activas, payload.ventas.landings.total, margin, y, contentW, 8, '#10b981')
  pdf.setFontSize(8)
  pdf.setTextColor(100, 116, 139)
  pdf.text(`${payload.ventas.landings.activas} activas / ${payload.ventas.landings.total} total`, margin, y + 12)
  y += 20

  // Top landings bar chart
  if (payload.ventas.top_landings?.length > 0) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Top Landings por Revenue', margin, y)
    y += 10

    const topData = payload.ventas.top_landings.slice(0, 5).map((l, i) => ({
      label: l.name.substring(0, 18),
      value: l.revenue,
      color: COLORS.primary[i % COLORS.primary.length]
    }))
    drawBarChart(pdf, topData, margin, y, contentW, 70, {
      horizontal: true,
      valueFormatter: (v) => fmtMoney(v)
    })
    y += 80
  }

  // Orders por mes
  if (payload.ventas.orders_por_mes?.length > 0) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Órdenes por Mes', margin, y)
    y += 10

    const orderData = payload.ventas.orders_por_mes.map(o => ({
      label: o.label.substring(0, 6),
      value: o.revenue,
      color: '#3b82f6'
    }))
    drawBarChart(pdf, orderData, margin, y, contentW, 60, {
      valueFormatter: (v) => `$${(v / 1000).toFixed(0)}k`
    })
    y += 75
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN: LEADS
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage()
  y = margin
  renderSectionHeader(pdf, 'Leads & Clientes', 'Pipeline y conversión de prospectos', margin, y, pageW)
  y += 22

  const leadsStats = [
    { label: 'Nuevos Leads', value: fmtNumber(payload.leads.nuevos), color: '#6366f1' },
    { label: 'Convertidos', value: fmtNumber(payload.leads.convertidos), color: '#10b981' },
    { label: 'Tasa Conversión', value: `${payload.leads.conversion_rate}%`, color: '#f59e0b' },
    { label: 'Valor Estimado', value: fmtMoney(payload.leads.valor_estimado_total), color: '#8b5cf6' },
  ]
  y = renderStatsRow(pdf, leadsStats, margin, y, contentW)
  y += 15

  // Funnel cohort
  pdf.setFontSize(13)
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Funnel de Conversión', margin, y)
  y += 10

  const funnelData = [
    { label: 'Leads', value: payload.leads.cohorte.total_leads, color: '#6366f1' },
    { label: 'Proyectos', value: payload.leads.cohorte.con_proyecto, color: '#8b5cf6' },
    { label: 'Pagos', value: payload.leads.cohorte.con_pago, color: '#10b981' },
  ]
  drawFunnel(pdf, funnelData, margin + 20, y, contentW - 40, 50)
  y += 65

  // Métricas cohorte
  const cohortMetrics = [
    { label: 'Lead → Proyecto', value: `${payload.leads.cohorte.conversion_lead_a_proyecto_pct}%` },
    { label: 'Proyecto → Pago', value: `${payload.leads.cohorte.conversion_proyecto_a_pago_pct}%` },
    { label: 'Fuga Funnel', value: `${payload.leads.cohorte.funnel_drop_pct}%` },
    { label: 'Días Lead→Proyecto', value: `${payload.leads.cohorte.dias_promedio_lead_a_proyecto}d` },
  ]
  y = renderMiniStats(pdf, cohortMetrics, margin, y, contentW)
  y += 10

  // Leads por estado pie chart
  if (payload.leads.por_estado?.length > 0) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Distribución por Estado', margin, y)
    y += 8

    const estadoData = payload.leads.por_estado.map(e => ({
      name: e.name,
      value: e.value,
      color: e.color || ESTADO_COLORS[e.name.toLowerCase()] || COLORS.primary[0]
    }))
    drawPieChart(pdf, estadoData, margin + 40, y + 35, 30, 15)
    y += 80
  }

  // Evolución mensual leads
  if (payload.leads.evolucion_mensual?.length > 0) {
    if (y > pageH - 100) { pdf.addPage(); y = margin }
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Evolución Mensual de Leads', margin, y)
    y += 10

    const evData = payload.leads.evolucion_mensual.map(e => ({
      label: e.month.substring(0, 6),
      value: e.leads
    }))
    drawLineChart(pdf, evData, margin, y, contentW, 60, {
      lineColor: '#6366f1',
      fillColor: '#6366f1',
      valueFormatter: (v) => String(Math.round(v))
    })
    y += 70
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN: PROYECTOS
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage()
  y = margin
  renderSectionHeader(pdf, 'Proyectos', 'Estado y lead time de proyectos activos', margin, y, pageW)
  y += 22

  const projStats = [
    { label: 'Total Proyectos', value: fmtNumber(payload.proyectos.total), color: '#3b82f6' },
    { label: 'Activos', value: fmtNumber(payload.proyectos.activos), color: '#10b981' },
    { label: 'Completados', value: fmtNumber(payload.proyectos.completados), color: '#059669' },
    { label: 'Lead Time', value: `${payload.proyectos.lead_time_promedio_dias}d`, color: '#f59e0b' },
  ]
  y = renderStatsRow(pdf, projStats, margin, y, contentW)
  y += 15

  // Proyectos por estado bar chart
  if (payload.proyectos.por_estado?.length > 0) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Proyectos por Estado', margin, y)
    y += 10

    const estadoProj = payload.proyectos.por_estado.map(e => ({
      label: e.name.substring(0, 12),
      value: e.value,
      color: e.color || ESTADO_COLORS[e.name.toLowerCase()] || '#3b82f6'
    }))
    drawBarChart(pdf, estadoProj, margin, y, contentW, 50, {
      valueFormatter: (v) => String(v)
    })
    y += 65
  }

  // Evolución mensual
  if (payload.proyectos.evolucion_mensual?.length > 0) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Creación Mensual de Proyectos', margin, y)
    y += 10

    const projEv = payload.proyectos.evolucion_mensual.map(e => ({
      label: e.label.substring(0, 6),
      value: e.value
    }))
    drawBarChart(pdf, projEv, margin, y, contentW, 50, {
      barColors: ['#3b82f6'],
      valueFormatter: (v) => String(v)
    })
    y += 65
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN: ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage()
  y = margin
  renderSectionHeader(pdf, 'Analytics', 'Trafico web y monitoreo de errores', margin, y, pageW)
  y += 22

  const analyticsStats = [
    { label: 'Visitas 7d', value: payload.analytics.visitas_7d ? fmtNumber(payload.analytics.visitas_7d) : 'N/A', color: '#f97316' },
    { label: 'Issues Sentry', value: payload.analytics.issues_sentry ? fmtNumber(payload.analytics.issues_sentry) : 'N/A', color: '#ef4444' },
    { label: 'Events 24h', value: payload.analytics.events_24h ? fmtNumber(payload.analytics.events_24h) : 'N/A', color: '#f59e0b' },
  ]
  y = renderStatsRow(pdf, analyticsStats, margin, y, contentW)
  y += 15

  // Visitas diarias
  if (payload.analytics.visitas_diarias?.length > 0) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Tráfico Web — Últimos 7 días', margin, y)
    y += 10

    const trafficData = payload.analytics.visitas_diarias.map(v => ({
      label: v.label.substring(0, 6),
      value: v.value
    }))
    drawLineChart(pdf, trafficData, margin, y, contentW, 60, {
      lineColor: '#f97316',
      fillColor: '#f97316',
      valueFormatter: (v) => String(Math.round(v))
    })
    y += 70
  }

  // Conversion funnel
  if (payload.analytics.conversion_funnel.visitas != null) {
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Funnel de Conversión Web', margin, y)
    y += 10

    const webFunnel = [
      { label: 'Visitas', value: payload.analytics.conversion_funnel.visitas || 0, color: '#6366f1' },
      { label: 'Clicks', value: payload.analytics.conversion_funnel.clicks || 0, color: '#8b5cf6' },
      { label: 'Conversiones', value: payload.analytics.conversion_funnel.conversiones || 0, color: '#10b981' },
    ]
    drawFunnel(pdf, webFunnel, margin + 20, y, contentW - 40, 45)
    y += 60
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTER FINAL
  // ═══════════════════════════════════════════════════════════════
  pdf.setFontSize(9)
  pdf.setTextColor(148, 163, 184)
  pdf.text(`Reporte generado el ${fechaStr} · Artia Studio CRM · artiaagency.vercel.app`, pageW / 2, pageH - 10, { align: 'center' })

  return pdf.output('blob')
}

// ─── Helper: Section Header ────────────────────────────────────────

function renderSectionHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string,
  x: number,
  y: number,
  pageW: number
) {
  pdf.setFillColor(248, 250, 252)
  pdf.rect(0, 0, pageW, y + 18, 'F')

  pdf.setTextColor(0, 17, 58)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, x, y)

  pdf.setFontSize(10)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'normal')
  pdf.text(subtitle, x, y + 8)

  pdf.setDrawColor(99, 102, 241)
  pdf.setLineWidth(1)
  pdf.line(x, y + 12, pageW - x, y + 12)
}

// ─── Helper: Stats Row ─────────────────────────────────────────────

function renderStatsRow(
  pdf: jsPDF,
  stats: { label: string; value: string; color: string }[],
  x: number,
  y: number,
  totalWidth: number
): number {
  const count = stats.length
  const gap = 8
  const cardW = (totalWidth - (count - 1) * gap) / count
  const cardH = 28

  stats.forEach((stat, i) => {
    const cardX = x + i * (cardW + gap)
    const [r, g, b] = hexToRgb(stat.color)

    // Card background
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(cardX, y, cardW, cardH, 6, 6, 'FD')

    // Top color bar
    pdf.setFillColor(r, g, b)
    pdf.rect(cardX, y, cardW, 3, 'F')

    // Label
    pdf.setFontSize(7)
    pdf.setTextColor(148, 163, 184)
    pdf.setFont('helvetica', 'bold')
    pdf.text(stat.label.toUpperCase(), cardX + 8, y + 12)

    // Value
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text(stat.value, cardX + 8, y + 24)
  })

  return y + cardH
}

// ─── Helper: Mini Stats Grid ───────────────────────────────────────

function renderMiniStats(
  pdf: jsPDF,
  stats: { label: string; value: string }[],
  x: number,
  y: number,
  totalWidth: number
): number {
  const count = stats.length
  const cols = Math.min(count, 4)
  const gap = 6
  const cardW = (totalWidth - (cols - 1) * gap) / cols
  const cardH = 22

  stats.forEach((stat, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cardX = x + col * (cardW + gap)
    const cardY = y + row * (cardH + gap)

    pdf.setFillColor(241, 245, 249)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD')

    pdf.setFontSize(7)
    pdf.setTextColor(100, 116, 139)
    pdf.setFont('helvetica', 'bold')
    pdf.text(stat.label.toUpperCase(), cardX + 6, cardY + 10)

    pdf.setFontSize(11)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text(stat.value, cardX + 6, cardY + 18)
  })

  return y + Math.ceil(count / cols) * (cardH + gap)
}