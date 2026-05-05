'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

// ─── Types ─────────────────────────────────────────────────────────

type Installment = {
  id?: string
  amount: string
  payment_date: string
  status: 'pagado' | 'pendiente' | 'vencido'
  payment_method?: string
  receipt_url?: string | null
  payment_number: number
}

type PaymentParent = {
  id: string
  lead_id: string
  contract_value: number
  description: string | null
  payment_month: string | null
  status: string
  created_at: string
  installments: Installment[]
  lead: {
    nombre: string
    folio: string | null
    servicio: string | null
    estimated_value: number | null
    contract_value: number | null
  } | null
}

type Lead = {
  id: string
  nombre: string
  folio: string | null
  servicio: string | null
  estimated_value: number | null
  contract_value: number | null
  payment_status: string | null
  estado: string | null
}

// ─── Constants ─────────────────────────────────────────────────────

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  otro: 'Otro',
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pagado:    { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: '✓ Pagado' },
  pendiente: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: '⏳ Pendiente' },
  vencido:   { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: '❌ Vencido' },
}

// ─── Helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  // Avoid timezone offset issues by parsing date-only strings explicitly
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function makeDefaultInstallment(date: string, num: number): Installment {
  return { amount: '', payment_date: date, status: 'pendiente', payment_method: 'transferencia', payment_number: num }
}

/** Returns true when installment is pending and past its due date */
function isVencida(inst: { status: string; payment_date?: string | null }): boolean {
  if (inst.status !== 'pendiente' || !inst.payment_date) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = inst.payment_date.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d) < today
}

/**
 * Derives payment_status from actual balances — FIXED:
 * - any overdue installment                        → 'vencido'
 * - total_paid >= contract_value                   → 'pagado'
 * - total_paid > 0 && total_paid < contract_value → 'parcial'
 * - total_paid === 0 && contract_value > 0         → 'pendiente'
 * - no contract                                    → 'sin_contrato'
 */
function computePaymentStatus(parent: PaymentParent): string {
  const insts = parent.installments
  if (insts.length === 0) return 'pendiente'

  const normalised = insts.map(i => ({ ...i, status: isVencida(i) ? 'vencido' as const : i.status }))
  const contractVal = parent.contract_value || 0
  const totalPagado = normalised
    .filter(i => i.status === 'pagado')
    .reduce((s, i) => s + (parseFloat(i.amount as string) || 0), 0)
  const anyVencido = normalised.some(i => i.status === 'vencido')

  if (anyVencido) return 'vencido'
  if (totalPagado >= contractVal && contractVal > 0) return 'pagado'
  if (totalPagado > 0) return 'parcial'
  if (contractVal > 0) return 'pendiente'
  return 'sin_contrato'
}

// ─── Component ─────────────────────────────────────────────────────

export default function FinanzasClient({
  payments: initPayments,
  leads,
}: {
  payments: PaymentParent[]
  leads: Lead[]
}) {
  const [payments, setPayments] = useState<PaymentParent[]>(initPayments)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterSearch, setFilterSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingExport, setLoadingExport] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [editPay, setEditPay] = useState<PaymentParent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── FIX HIDRATACIÓN #418: toda la lógica de fecha vive solo en el cliente ──
  const [mounted, setMounted] = useState(false)
  const [hoy, setHoy] = useState({ fecha: '', mes: '', anio: 0 })

  useEffect(() => {
    const d = new Date()
    setHoy({
      fecha: d.toISOString().slice(0, 10),
      mes: MESES[d.getMonth()] + ' ' + d.getFullYear(),
      anio: d.getFullYear(),
    })
    setMounted(true)
  }, [])

  // ── Form state ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    lead_id: '',
    contract_value: '',
    description: '',
    payment_month: '',
    status: 'activo',
    installments: [] as Installment[],
  })

  // Populate default installments only after mount (avoids hydration mismatch)
  useEffect(() => {
    if (!mounted || editPay) return
    setForm((f) =>
      f.installments.length === 0
        ? { ...f, installments: [makeDefaultInstallment(hoy.fecha, 1), makeDefaultInstallment(hoy.fecha, 2)] }
        : f,
    )
  }, [mounted, editPay, hoy.fecha])

  // ─── Computed — FIXED: pending = contract - paid ─────────────────

  const stats = useMemo(() => {
    const totalContratos = payments.reduce((s, p) => s + (p.contract_value || 0), 0)
    const totalPagado = payments.reduce((s, p) =>
      s + p.installments.filter(i => i.status === 'pagado').reduce((sum, i) => sum + (parseFloat(i.amount as any) || 0), 0), 0)
    // FIXED: pending = contract_value - paid (NOT sum of non-paid installments)
    const totalPendiente = Math.max(0, totalContratos - totalPagado)
    const clientesActivos = new Set(payments.map(p => p.lead_id)).size
    return { totalContratos, totalPagado, totalPendiente, clientesActivos }
  }, [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'pagado' && p.installments.every(i => i.status === 'pagado')) ||
        (filterStatus === 'pendiente' && p.installments.some(i => i.status !== 'pagado'))
      const search = filterSearch.toLowerCase()
      const matchSearch =
        !search ||
        (p.lead?.nombre ?? '').toLowerCase().includes(search) ||
        (p.lead?.folio ?? '').toLowerCase().includes(search) ||
        (p.description ?? '').toLowerCase().includes(search)
      return matchStatus && matchSearch
    })
  }, [payments, filterStatus, filterSearch])

  // ─── Actions ───────────────────────────────────────────────────

  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  /** Persist recalculated payment_status back to the lead row */
  async function persistPaymentStatus(leadId: string, status: string) {
    try {
      await fetch('/api/admin/lead-payment-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, payment_status: status }),
      })
    } catch (_) { /* non-blocking */ }
  }

  function addInstallment() {
    setForm(prev => ({
      ...prev,
      installments: [
        ...prev.installments,
        makeDefaultInstallment(hoy.fecha, prev.installments.length + 1),
      ],
    }))
  }

  function removeInstallment(index: number) {
    setForm(prev => ({
      ...prev,
      installments: prev.installments
        .filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, payment_number: i + 1 })),
    }))
  }

  function updateInstallment(index: number, field: keyof Installment, value: any) {
    setForm(prev => ({
      ...prev,
      installments: prev.installments.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst,
      ),
    }))
  }

  async function uploadComprobante(file: File, index: number) {
    setUploadingIndex(index)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('payment_id', editPay?.id || 'new')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        updateInstallment(index, 'receipt_url', data.url)
        showMsg('Comprobante adjuntado ✓')
      } else showMsg('Error subiendo comprobante', false)
    } finally {
      setUploadingIndex(null)
    }
  }

  function openEdit(p: PaymentParent) {
    setEditPay(p)
    setForm({
      lead_id: p.lead_id,
      contract_value: String(p.contract_value),
      description: p.description ?? '',
      payment_month: p.payment_month ?? hoy.mes,
      status: p.status,
      installments: p.installments.map(inst => ({
        ...inst,
        amount: String(inst.amount),
        payment_method: inst.payment_method ?? 'transferencia',
      })),
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openNew() {
    setEditPay(null)
    setForm({
      lead_id: '',
      contract_value: '',
      description: '',
      payment_month: hoy.mes,
      status: 'activo',
      installments: [makeDefaultInstallment(hoy.fecha, 1), makeDefaultInstallment(hoy.fecha, 2)],
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lead_id || !form.contract_value || form.installments.length === 0) return
    setSaving(true)
    try {
      const body = {
        lead_id: form.lead_id,
        contract_value: parseFloat(form.contract_value),
        description: form.description || null,
        payment_month: form.payment_month || null,
        status: form.status,
        installments: form.installments.map(inst => ({
          ...inst,
          amount: parseFloat(inst.amount),
          id: inst.id,
        })),
      }

      if (editPay) {
        const res = await fetch(`/api/admin/payments/${editPay.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok) {
          const refreshRes  = await fetch('/api/admin/payments')
          const refreshData = await refreshRes.json()
          const refreshed   = (refreshData.payments || []) as PaymentParent[]
          setPayments(refreshed)
          const updated = refreshed.find((p: PaymentParent) => p.id === editPay.id)
          if (updated) await persistPaymentStatus(updated.lead_id, computePaymentStatus(updated))
          showMsg('Contrato actualizado ✓')
          setShowForm(false)
          setEditPay(null)
        } else showMsg(data.error ?? 'Error', false)
      } else {
        const res = await fetch('/api/admin/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.parent) {
          const newParent = data.parent as PaymentParent
          setPayments(prev => [newParent, ...prev])
          await persistPaymentStatus(newParent.lead_id, computePaymentStatus(newParent))
          showMsg('Contrato registrado ✓')
          setShowForm(false)
        } else showMsg(data.error ?? 'Error', false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function deletePay(id: string) {
    if (!confirm('¿Eliminar este contrato y todas sus cuotas?')) return
    const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPayments(prev => prev.filter(p => p.id !== id))
      showMsg('Contrato eliminado')
    } else showMsg('Error eliminando', false)
  }


  // ─── Export Excel (.xlsx) ──────────────────────────────────────

async function exportarExcel() {
  if (payments.length === 0) { showMsg('No hay registros para exportar', false); return }

  setLoadingExport(true)
  showMsg('Generando Excel…')

  try {
    const XLSX = await import('xlsx')

    // Hoja 1: Resumen
    const resumenHeaders = [
      'Folio', 'Cliente', 'Servicio', 'Valor Contrato (USD)',
      'Total Pagado (USD)', 'Pendiente (USD)', 'Progreso %',
      'Descripción', 'Mes Referencia', 'Estado', 'Cuotas',
    ]

    const resumenRows = payments.map(p => {
      const pagado = p.installments
        .filter(i => i.status === 'pagado')
        .reduce((s, i) => s + (parseFloat(i.amount as any) || 0), 0)
      // FIXED: pending = contract - paid
      const pendiente = Math.max(0, (p.contract_value || 0) - pagado)
      const pct = p.contract_value > 0 ? Math.round((pagado / p.contract_value) * 100) : 0
      const todasPagadas = p.installments.length > 0 && p.installments.every(i => i.status === 'pagado')
      const algunaVencida = p.installments.some(
        i => i.status === 'pendiente' && i.payment_date && new Date(i.payment_date.split('T')[0]) < new Date(new Date().toDateString()),
      )

      return [
        p.lead?.folio ?? '',
        p.lead?.nombre ?? '',
        p.lead?.servicio ?? '',
        p.contract_value,
        pagado,
        pendiente,
        `${pct}%`,
        p.description ?? '',
        p.payment_month ?? '',
        todasPagadas ? 'Completado' : algunaVencida ? 'Con vencidas' : 'En progreso',
        p.installments.length,
      ]
    })

    const wsResumen = XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows])

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'center' },
    }

    const range = XLSX.utils.decode_range(wsResumen['!ref'] || 'A1')
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = wsResumen[XLSX.utils.encode_cell({ r: 0, c: C })]
      if (cell) cell.s = headerStyle
    }

    wsResumen['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 30 },
      { wch: 16 }, { wch: 14 }, { wch: 10 },
    ]

    // Hoja 2: Detalle Cuotas
    const detalleHeaders = [
      'Folio', 'Cliente', 'Servicio', 'Valor Contrato (USD)',
      'Descripción', 'Mes Referencia',
      'Cuota #', 'Monto Cuota (USD)', 'Fecha Cuota',
      'Estado Cuota', 'Tipo de Pago', 'Comprobante URL',
    ]

    const detalleRows: any[][] = []
    payments.forEach(p => {
      const insts = [...p.installments].sort((a, b) => a.payment_number - b.payment_number)
      if (insts.length === 0) {
        detalleRows.push([
          p.lead?.folio ?? '', p.lead?.nombre ?? '', p.lead?.servicio ?? '',
          p.contract_value, p.description ?? '', p.payment_month ?? '',
          '', '', '', '', '', '',
        ])
      } else {
        insts.forEach(inst => {
          detalleRows.push([
            p.lead?.folio ?? '',
            p.lead?.nombre ?? '',
            p.lead?.servicio ?? '',
            p.contract_value,
            p.description ?? '',
            p.payment_month ?? '',
            inst.payment_number,
            parseFloat(inst.amount as any) || 0,
            inst.payment_date ?? '',
            inst.status,
            inst.payment_method ? (METHOD_LABELS[inst.payment_method] ?? inst.payment_method) : '',
            inst.receipt_url ?? '',
          ])
        })
      }
    })

    const wsDetalle = XLSX.utils.aoa_to_sheet([detalleHeaders, ...detalleRows])

    const range2 = XLSX.utils.decode_range(wsDetalle['!ref'] || 'A1')
    for (let C = range2.s.c; C <= range2.e.c; ++C) {
      const cell = wsDetalle[XLSX.utils.encode_cell({ r: 0, c: C })]
      if (cell) cell.s = headerStyle
    }

    wsDetalle['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
      { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Contratos')
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Cuotas')

    const fileName = `finanzas_${(hoy.mes || 'export').replace(/\s+/g, '_')}.xlsx`
    XLSX.writeFile(wb, fileName)

    showMsg('Excel descargado ✓')
  } catch (err) {
    console.error('Error exportando Excel:', err)
    showMsg('Error al generar Excel. ¿Instalaste xlsx? (npm install xlsx)', false)
  } finally {
    setLoadingExport(false)
  }
}

  // ─── Export CSV ────────────────────────────────────────────────

  function exportarCSV() {
    if (payments.length === 0) { showMsg('No hay registros para exportar', false); return }

    const headers = [
      'Folio',
      'Cliente',
      'Servicio',
      'Valor Contrato (USD)',
      'Descripción',
      'Mes Referencia',
      'Cuota #',
      'Monto Cuota (USD)',
      'Fecha Cuota',
      'Estado Cuota',
      'Tipo de Pago',
      'Comprobante URL',
    ]

    const rows: string[][] = []
    payments.forEach(p => {
      const insts = [...p.installments].sort((a, b) => a.payment_number - b.payment_number)
      if (insts.length === 0) {
        rows.push([
          p.lead?.folio ?? '',
          p.lead?.nombre ?? '',
          p.lead?.servicio ?? '',
          String(p.contract_value),
          p.description ?? '',
          p.payment_month ?? '',
          '', '', '', '', '', '',
        ])
      } else {
        insts.forEach(inst => {
          rows.push([
            p.lead?.folio ?? '',
            p.lead?.nombre ?? '',
            p.lead?.servicio ?? '',
            String(p.contract_value),
            p.description ?? '',
            p.payment_month ?? '',
            String(inst.payment_number),
            String(inst.amount),
            inst.payment_date ?? '',
            inst.status,
            inst.payment_method ? (METHOD_LABELS[inst.payment_method] ?? inst.payment_method) : '',
            inst.receipt_url ?? '',
          ])
        })
      }
    })

    let csv = '\ufeff' + headers.join(',') + '\n'
    rows.forEach(row => {
      csv += row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finanzas_${(hoy.mes || 'export').replace(/\s+/g, '_')}.csv`
    link.click()
    showMsg('CSV descargado ✓')
  }

  // ─── Export PDF ────────────────────────────────────────────────

  function exportarPDF() {
    if (payments.length === 0) { showMsg('No hay registros para exportar', false); return }

    // Build printable HTML and trigger browser print-to-PDF
    const filas = payments.flatMap(p => {
      const insts = [...p.installments].sort((a, b) => a.payment_number - b.payment_number)
      if (insts.length === 0) {
        return [`<tr>
          <td>${p.lead?.folio ?? '—'}</td>
          <td>${p.lead?.nombre ?? '—'}</td>
          <td>${p.lead?.servicio ?? '—'}</td>
          <td>$${Number(p.contract_value).toFixed(2)}</td>
          <td>${p.description ?? ''}</td>
          <td>${p.payment_month ?? ''}</td>
          <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
        </tr>`]
      }
      return insts.map(inst => {
        const estadoColor = inst.status === 'pagado' ? '#166534' : inst.status === 'vencido' ? '#991b1b' : '#92400e'
        const estadoBg   = inst.status === 'pagado' ? '#dcfce7' : inst.status === 'vencido' ? '#fee2e2' : '#fef3c7'
        const [y, m, d]  = (inst.payment_date ?? '').split('T')[0].split('-').map(Number)
        const fechaFmt   = inst.payment_date
          ? new Date(y, m - 1, d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—'
        return `<tr>
          <td>${p.lead?.folio ?? '—'}</td>
          <td>${p.lead?.nombre ?? '—'}</td>
          <td>${p.lead?.servicio ?? '—'}</td>
          <td>$${Number(p.contract_value).toFixed(2)}</td>
          <td>${p.description ?? ''}</td>
          <td>${p.payment_month ?? ''}</td>
          <td style="text-align:center">#${inst.payment_number}</td>
          <td>$${Number(inst.amount).toFixed(2)}</td>
          <td>${fechaFmt}</td>
          <td style="background:${estadoBg};color:${estadoColor};font-weight:700;text-align:center;border-radius:4px">
            ${inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
          </td>
          <td>${inst.payment_method ? (METHOD_LABELS[inst.payment_method] ?? inst.payment_method) : '—'}</td>
        </tr>`
      })
    }).join('')

    // FIXED: pending = contract - paid
    const totalPagado    = payments.reduce((s, p) => s + p.installments.filter(i => i.status === 'pagado').reduce((ss, i) => ss + (parseFloat(i.amount as any) || 0), 0), 0)
    const totalContrato  = payments.reduce((s, p) => s + (p.contract_value || 0), 0)
    const totalPendiente = Math.max(0, totalContrato - totalPagado)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Finanzas — ${hoy.mes || 'Reporte'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
  h1  { font-size: 18px; font-weight: 900; color: #00113a; margin-bottom: 4px; }
  .subtitle { font-size: 11px; color: #64748b; margin-bottom: 16px; }
  .kpis { display: flex; gap: 12px; margin-bottom: 20px; }
  .kpi  { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
  .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
  .kpi-val   { font-size: 15px; font-weight: 900; }
  table  { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead  { background: #1e3a5f; color: white; }
  th     { padding: 7px 8px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; }
  td     { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; text-align: right; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>💰 Reporte Financiero</h1>
  <div class="subtitle">Generado el ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })} · ${hoy.mes}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total Contratos</div><div class="kpi-val" style="color:#5b21b6">$${totalContrato.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Cobrado</div><div class="kpi-val" style="color:#059669">$${totalPagado.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Por Cobrar</div><div class="kpi-val" style="color:#d97706">$${totalPendiente.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Contratos</div><div class="kpi-val" style="color:#2563eb">${payments.length}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Folio</th><th>Cliente</th><th>Servicio</th>
        <th>Contrato</th><th>Descripción</th><th>Mes</th>
        <th>Cuota</th><th>Monto</th><th>Fecha</th>
        <th>Estado</th><th>Tipo Pago</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="footer">Artia Studio · Sistema Contable · ${new Date().toISOString().slice(0,10)}</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) { showMsg('Permite ventanas emergentes para exportar PDF', false); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
    showMsg('PDF listo para imprimir / guardar ✓')
  }

  // ─── Styles ────────────────────────────────────────────────────

  const cardHeader: React.CSSProperties = {
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    color: 'white',
  }

  const cardBody: React.CSSProperties = { padding: '20px 24px' }

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#f8fafc',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
  }

  const lbl: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color: '#64748b',
    display: 'block',
    marginBottom: 5,
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px', boxSizing: 'border-box' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
          maxWidth: 'calc(100vw - 40px)',
        }}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#00113a', margin: 0 }}>
              💰 Sistema Contable
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Gestión de contratos y cuotas en tiempo real
            </p>
          </div>
          {/* Mes — solo se muestra después del mount para evitar hidratación */}
          {mounted && (
            <div style={{
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #667eea20, #764ba220)',
              border: '1px solid #667eea40', borderRadius: 50,
              fontSize: 12, fontWeight: 700, color: '#5b21b6',
            }}>
              📅 {hoy.mes}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14, marginBottom: 22,
      }}>
        {[
          { icon: '💵', label: 'Total Contratos', value: fmtMoney(stats.totalContratos), color: '#5b21b6' },
          { icon: '✅', label: 'Total Pagado', value: fmtMoney(stats.totalPagado), color: '#059669' },
          { icon: '⏳', label: 'Por Cobrar', value: fmtMoney(stats.totalPendiente), color: '#d97706' },
          { icon: '👥', label: 'Clientes Activos', value: String(stats.clientesActivos), color: '#2563eb' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 16, padding: '18px 20px',
            border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${kpi.color}18`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', marginBottom: 10,
            }}>
              {kpi.icon}
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: 4 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: kpi.color, letterSpacing: '-0.5px' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: responsive — stack en móvil */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'clamp(300px, 380px, 420px) 1fr',
        gap: 20,
      }}
        className="finanzas-grid"
      >
        {/* ── Form Panel ─────────────────────────────────────── */}
        <div style={{
          background: 'white', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0', height: 'fit-content',
          overflow: 'hidden',
        }}>
          <div style={cardHeader}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              📝 {editPay ? 'Editar Contrato' : 'Nuevo Contrato'}
            </h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: '3px 0 0' }}>
              {editPay ? 'Modifica los datos del contrato' : 'Registra un contrato con sus cuotas'}
            </p>
          </div>

          <div style={{ ...cardBody, maxHeight: '82vh', overflowY: 'auto' }}>
            <form onSubmit={handleSubmit}>

              {/* Cliente */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>👤 Cliente *</label>
                <select
                  value={form.lead_id}
                  onChange={(e) => setForm(p => ({ ...p, lead_id: e.target.value }))}
                  style={inp}
                  required
                  disabled={!!editPay}
                >
                  <option value="">Seleccionar cliente…</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}{l.folio ? ` (${l.folio})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor Contrato */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>💰 Valor Total del Contrato (USD) *</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.contract_value}
                  onChange={(e) => setForm(p => ({ ...p, contract_value: e.target.value }))}
                  style={inp} required placeholder="0.00"
                />
              </div>

              {/* Mes de Referencia */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>📆 Mes de Referencia</label>
                <input
                  type="text"
                  value={form.payment_month}
                  onChange={(e) => setForm(p => ({ ...p, payment_month: e.target.value }))}
                  style={inp}
                  placeholder={mounted ? hoy.mes : ''}
                />
                {mounted && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                    {MESES.map(m => (
                      <button
                        key={m} type="button"
                        onClick={() => setForm(p => ({ ...p, payment_month: `${m} ${hoy.anio}` }))}
                        style={{
                          fontSize: 9, padding: '3px 7px', borderRadius: 7,
                          border: '1px solid #e2e8f0',
                          background: form.payment_month?.startsWith(m) ? '#00113a' : '#f8fafc',
                          color: form.payment_month?.startsWith(m) ? '#fff' : '#64748b',
                          cursor: 'pointer', fontWeight: 700,
                        }}
                      >
                        {m.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>📝 Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Proyecto web — 50% anticipo"
                  style={inp}
                />
              </div>

              {/* Cuotas Dinámicas */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>📋 Cuotas del Contrato</label>
                  <button
                    type="button" onClick={addInstallment}
                    style={{
                      padding: '5px 11px', background: '#00113a', color: 'white',
                      border: 'none', borderRadius: 7, fontSize: '0.75rem',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    + Añadir cuota
                  </button>
                </div>

                {form.installments.map((inst, index) => (
                  <div key={index} style={{
                    background: '#f8fafc', borderRadius: 10,
                    border: '1px solid #e2e8f0', padding: '12px',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00113a' }}>
                        Cuota #{inst.payment_number}
                      </span>
                      {form.installments.length > 1 && (
                        <button
                          type="button" onClick={() => removeInstallment(index)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>

                    {/* Monto + Fecha */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={lbl}>Monto (USD) *</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={inst.amount}
                          onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                          style={{ ...inp, padding: '8px 10px' }}
                          required placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={lbl}>Fecha de Pago *</label>
                        <input
                          type="date"
                          value={inst.payment_date}
                          onChange={(e) => updateInstallment(index, 'payment_date', e.target.value)}
                          style={{ ...inp, padding: '8px 10px' }}
                          required
                        />
                      </div>
                    </div>

                    {/* Estado + TIPO DE PAGO */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={lbl}>Estado</label>
                        <select
                          value={inst.status}
                          onChange={(e) => updateInstallment(index, 'status', e.target.value)}
                          style={{ ...inp, padding: '8px 10px' }}
                        >
                          <option value="pendiente">⏳ Pendiente</option>
                          <option value="pagado">✓ Pagado</option>
                          <option value="vencido">❌ Vencido</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Tipo de Pago</label>
                        <select
                          value={inst.payment_method ?? 'transferencia'}
                          onChange={(e) => updateInstallment(index, 'payment_method', e.target.value)}
                          style={{ ...inp, padding: '8px 10px' }}
                        >
                          {Object.entries(METHOD_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Comprobante */}
                    <div>
                      <label style={lbl}>Comprobante</label>
                      {inst.receipt_url ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px', background: '#eff6ff',
                          borderRadius: 7, border: '1px solid #bfdbfe',
                        }}>
                          <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.72rem', color: '#2552ca', fontWeight: 700 }}>
                            Ver ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => updateInstallment(index, 'receipt_url', null)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                          >×</button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRefs.current[index]?.click()}
                          style={{
                            border: '2px dashed #e2e8f0', borderRadius: 7,
                            padding: '9px', textAlign: 'center', cursor: 'pointer',
                            background: '#f8fafc', fontSize: '0.72rem',
                            color: '#64748b', fontWeight: 600,
                          }}
                        >
                          {uploadingIndex === index ? '⏳ Subiendo…' : '📎 Adjuntar'}
                        </div>
                      )}
                      <input
                        ref={el => { fileInputRefs.current[index] = el }}
                        type="file" accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) uploadComprobante(f, index)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={saving}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white', border: 'none', borderRadius: 11,
                  fontSize: '0.9rem', fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                  boxSizing: 'border-box',
                }}
              >
                {saving ? '⏳ Guardando…' : editPay ? '💾 Actualizar Contrato' : '💾 Guardar Contrato'}
              </button>

              {editPay && (
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditPay(null) }}
                  style={{
                    width: '100%', marginTop: 8, padding: '11px',
                    background: '#f1f5f9', color: '#64748b',
                    border: '1.5px solid #e2e8f0', borderRadius: 11,
                    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </form>
          </div>
        </div>

        {/* ── Table Panel ────────────────────────────────────── */}
        <div style={{
          background: 'white', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0', overflow: 'hidden',
          minWidth: 0, // permite que la tabla no desborde el grid
        }}>
          <div style={cardHeader}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              📋 Historial de Contratos
            </h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: '3px 0 0' }}>
              {filteredPayments.length} contrato{filteredPayments.length !== 1 ? 's' : ''} encontrado{filteredPayments.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div style={cardBody}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="🔍 Buscar cliente, folio, descripción…"
                style={{ ...inp, flex: '1 1 200px', minWidth: 160 }}
              />
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                {['todos', 'pagado', 'pendiente'].map(s => (
                  <button
                    key={s} onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '7px 13px', borderRadius: 50,
                      fontSize: '0.75rem', fontWeight: 700, border: '2px solid',
                      cursor: 'pointer',
                      background: filterStatus === s ? '#00113a' : 'white',
                      color: filterStatus === s ? 'white' : '#64748b',
                      borderColor: filterStatus === s ? '#00113a' : '#e2e8f0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              {/* Dropdown Exportar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setShowExportMenu(m => !m)}
                  disabled={loadingExport}
                  style={{
                    padding: '9px 16px',
                    background: loadingExport ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white', border: 'none', borderRadius: 9,
                    fontSize: '0.8rem', fontWeight: 700,
                    cursor: loadingExport ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: loadingExport ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  {loadingExport ? '⏳ Generando…' : '📊 Exportar'}
                  <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>▼</span>
                </button>

                {showExportMenu && !loadingExport && (
                  <>
                    {/* Overlay para cerrar al hacer clic fuera */}
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      background: 'white', borderRadius: 10, zIndex: 999,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                      border: '1px solid #e2e8f0', overflow: 'hidden',
                      minWidth: 190,
                    }}>
                      {/* Excel */}
                      <button
                        onClick={() => { setShowExportMenu(false); exportarExcel() }}
                        style={{
                          width: '100%', padding: '11px 16px', border: 'none',
                          background: 'white', cursor: 'pointer', textAlign: 'left',
                          fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
                          display: 'flex', alignItems: 'center', gap: 10,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📊</span>
                        <div>
                          <div>Exportar Excel</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>2 hojas: resumen + detalle</div>
                        </div>
                      </button>

                      {/* CSV */}
                      <button
                        onClick={() => { setShowExportMenu(false); exportarCSV() }}
                        style={{
                          width: '100%', padding: '11px 16px', border: 'none',
                          background: 'white', cursor: 'pointer', textAlign: 'left',
                          fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
                          display: 'flex', alignItems: 'center', gap: 10,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📄</span>
                        <div>
                          <div>Exportar CSV</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Compatible con Excel / Sheets</div>
                        </div>
                      </button>

                      {/* PDF */}
                      <button
                        onClick={() => { setShowExportMenu(false); exportarPDF() }}
                        style={{
                          width: '100%', padding: '11px 16px', border: 'none',
                          background: 'white', cursor: 'pointer', textAlign: 'left',
                          fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <span style={{ fontSize: '1.1rem' }}>🖨️</span>
                        <div>
                          <div>Exportar PDF</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Abre vista de impresión</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', color: 'white' }}>
                    {['Cliente', 'Descripción', 'Contrato', 'Progreso', 'Cuotas', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{
                        padding: '12px 10px', textAlign: 'left',
                        fontSize: '0.65rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.8px',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                          <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.4 }}>📭</div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                            Sin registros
                          </h3>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => {
                      const pagado = p.installments
                        .filter(i => i.status === 'pagado')
                        .reduce((s, i) => s + (parseFloat(i.amount as any) || 0), 0)
                      const pct = p.contract_value > 0 ? Math.min((pagado / p.contract_value) * 100, 100) : 0
                      const todasPagadas = p.installments.length > 0 && p.installments.every(i => i.status === 'pagado')
                      const algunaVencida = p.installments.some(
                        i => i.status === 'pendiente' && i.payment_date && new Date(i.payment_date.split('T')[0]) < new Date(new Date().toDateString()),
                      )

                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Cliente */}
                          <td style={{ padding: '11px 10px', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                              {p.lead?.nombre ?? '—'}
                            </div>
                            {p.lead?.folio && (
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {p.lead.folio}
                              </div>
                            )}
                            {p.payment_month && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                                {p.payment_month}
                              </div>
                            )}
                          </td>

                          {/* Descripción */}
                          <td style={{ padding: '11px 10px', verticalAlign: 'top', maxWidth: 160 }}>
                            <div style={{
                              fontSize: '0.78rem', color: '#475569',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {p.description || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                            </div>
                          </td>

                          {/* Contrato */}
                          <td style={{ padding: '11px 10px', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#00113a', whiteSpace: 'nowrap' }}>
                              {fmtMoney(p.contract_value)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {p.installments.length} cuota(s)
                            </div>
                          </td>

                          {/* Progreso */}
                          <td style={{ padding: '11px 10px', minWidth: 110, verticalAlign: 'top' }}>
                            <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: pct >= 100
                                  ? 'linear-gradient(90deg, #10b981, #059669)'
                                  : 'linear-gradient(90deg, #667eea, #764ba2)',
                                borderRadius: 4, transition: 'width 0.5s',
                              }} />
                            </div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', marginTop: 3, whiteSpace: 'nowrap' }}>
                              {Math.round(pct)}% · {fmtMoney(pagado)}
                            </div>
                          </td>

                          {/* Cuotas */}
                          <td style={{ padding: '11px 10px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {[...p.installments]
                                .sort((a, b) => a.payment_number - b.payment_number)
                                .map(inst => {
                                  const ec = ESTADO_COLORS[inst.status] ?? ESTADO_COLORS.pendiente
                                  const vencida =
                                    inst.status === 'pendiente' &&
                                    inst.payment_date &&
                                    new Date(inst.payment_date.split('T')[0]) < new Date(new Date().toDateString())

                                  return (
                                    <div key={inst.id ?? inst.payment_number} style={{
                                      display: 'flex', alignItems: 'center', gap: 5,
                                      padding: '3px 7px', borderRadius: 5,
                                      background: ec.bg, fontSize: '0.7rem',
                                      flexWrap: 'wrap',
                                    }}>
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: ec.dot, flexShrink: 0 }} />
                                      <span style={{ fontWeight: 700, color: ec.text, whiteSpace: 'nowrap' }}>
                                        #{inst.payment_number}: {fmtMoney(parseFloat(inst.amount as any))}
                                      </span>
                                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {fmtDate(inst.payment_date)}
                                      </span>
                                      {inst.payment_method && (
                                        <span style={{ color: '#94a3b8', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                                          {METHOD_LABELS[inst.payment_method] ?? inst.payment_method}
                                        </span>
                                      )}
                                      {vencida && (
                                        <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.6rem' }}>⚠️</span>
                                      )}
                                      {inst.receipt_url && (
                                        <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer"
                                          style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.65rem' }}>
                                          📎
                                        </a>
                                      )}
                                    </div>
                                  )
                                })}
                            </div>
                          </td>

                          {/* Estado */}
                          <td style={{ padding: '11px 10px', verticalAlign: 'top' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 50,
                              fontSize: '0.65rem', fontWeight: 800,
                              background: todasPagadas ? '#dcfce7' : algunaVencida ? '#fee2e2' : '#fef3c7',
                              color: todasPagadas ? '#166534' : algunaVencida ? '#991b1b' : '#92400e',
                              whiteSpace: 'nowrap',
                            }}>
                              <span style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: todasPagadas ? '#22c55e' : algunaVencida ? '#ef4444' : '#f59e0b',
                              }} />
                              {todasPagadas ? 'Completado' : algunaVencida ? 'Con vencidas' : 'En progreso'}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '11px 10px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button
                                onClick={() => openEdit(p)}
                                style={{
                                  padding: '5px 10px', fontSize: '0.72rem', fontWeight: 800,
                                  color: '#2563eb', background: '#eff6ff', border: 'none',
                                  borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap',
                                }}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => deletePay(p.id)}
                                style={{
                                  padding: '5px 9px', fontSize: '0.72rem', fontWeight: 800,
                                  color: '#dc2626', background: '#fef2f2', border: 'none',
                                  borderRadius: 7, cursor: 'pointer',
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive CSS — stack a una sola columna en pantallas pequeñas */}
      <style>{`
        @media (max-width: 900px) {
          .finanzas-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}