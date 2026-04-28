'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────

type Payment = {
  id: string
  lead_id: string
  amount: number
  status: string
  method: string
  description: string | null
  fecha: string
  comprobante_url?: string | null
  payment_month?: string | null
  due_date?: string | null
  payment_number?: number | null
  lead: {
    nombre: string
    folio: string | null
    servicio: string | null
    estimated_value: number | null
    contract_value?: number | null
  } | null
}

type Lead = {
  id: string
  nombre: string
  folio: string | null
  servicio: string | null
  estimated_value: number | null
  contract_value?: number | null
  payment_status: string | null
  estado: string | null
}

// ─── Constants ─────────────────────────────────────────────────────

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  otro: 'Otro',
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pagado:     { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: '✓ Pagado' },
  pendiente:  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: '⏳ Pendiente' },
  cancelado:  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: '❌ Cancelado' },
}

// ─── Helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function currentMesLabel() {
  const d = new Date()
  return MESES[d.getMonth()] + ' ' + d.getFullYear()
}

// ─── Component ─────────────────────────────────────────────────────

export default function FinanzasClient({
  payments: initPayments,
  leads,
}: {
  payments: Payment[]
  leads: Lead[]
}) {
  const [payments, setPayments] = useState<Payment[]>(initPayments)
  const [showForm, setShowForm] = useState(false)
  const [editPay, setEditPay] = useState<Payment | null>(null)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterSearch, setFilterSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingComp, setUploadingComp] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const compInputRef = useRef<HTMLInputElement>(null)

  // Hydration-safe date
  const [mounted, setMounted] = useState(false)
  const [hoy, setHoy] = useState({ fecha: '', mes: '', mesKey: '0000-00', anio: 2026 })

  useEffect(() => {
    const d = new Date()
    setHoy({
      fecha: d.toISOString().slice(0, 10),
      mes: MESES[d.getMonth()] + ' ' + d.getFullYear(),
      mesKey: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      anio: d.getFullYear(),
    })
    setMounted(true)
  }, [])

  // Form state
  const [form, setForm] = useState({
    lead_id: '',
    amount: '',
    method: 'transferencia',
    description: '',
    fecha: '',
    status: 'pagado',
    comprobante_url: '',
    payment_month: '',
    due_date: '',
    payment_number: '',
  })

  useEffect(() => {
    if (mounted) {
      setForm((f) => ({
        ...f,
        fecha: f.fecha || hoy.fecha,
        payment_month: f.payment_month || hoy.mes,
      }))
    }
  }, [mounted, hoy.fecha, hoy.mes])

  // ─── Computed ──────────────────────────────────────────────────

  const ingresoTotal = useMemo(
    () => payments.filter((p) => p.status === 'pagado').reduce((s, p) => s + p.amount, 0),
    [payments]
  )

  const ingresoMes = useMemo(
    () =>
      mounted
        ? payments
            .filter((p) => p.status === 'pagado' && p.fecha.startsWith(hoy.mesKey))
            .reduce((s, p) => s + p.amount, 0)
        : 0,
    [payments, mounted, hoy.mesKey]
  )

  const pendienteTotal = useMemo(
    () => payments.filter((p) => p.status === 'pendiente').reduce((s, p) => s + p.amount, 0),
    [payments]
  )

  const totalContratos = useMemo(
    () => leads.reduce((s, l) => s + (l.contract_value || l.estimated_value || 0), 0),
    [leads]
  )

  // Monthly chart data
  const mesesChart: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {}
    if (!mounted) return result
    const base = new Date(hoy.anio, new Date().getMonth(), 1)
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(base.getFullYear(), base.getMonth() - i, 1)
      result[dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0')] = 0
    }
    payments
      .filter((p) => p.status === 'pagado')
      .forEach((p) => {
        const k = p.fecha.slice(0, 7)
        if (k in result) result[k] += p.amount
      })
    return result
  }, [payments, mounted, hoy.anio])

  const maxMes = Math.max(...Object.values(mesesChart), 1)

  // Group by lead
  const byLead = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string
        folio: string | null
        pagado: number
        pendiente: number
        contractValue: number | null
        payments: Payment[]
      }
    > = {}
    payments.forEach((p) => {
      if (!map[p.lead_id]) {
        map[p.lead_id] = {
          nombre: p.lead?.nombre ?? '—',
          folio: p.lead?.folio ?? null,
          pagado: 0,
          pendiente: 0,
          contractValue: p.lead?.contract_value ?? p.lead?.estimated_value ?? null,
          payments: [],
        }
      }
      if (p.status === 'pagado') map[p.lead_id].pagado += p.amount
      if (p.status === 'pendiente') map[p.lead_id].pendiente += p.amount
      map[p.lead_id].payments.push(p)
    })
    return map
  }, [payments])

  // Filtered payments for table
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchStatus = filterStatus === 'todos' || p.status === filterStatus
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

  async function uploadComprobante(file: File) {
    setUploadingComp(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        setForm((p) => ({ ...p, comprobante_url: data.url }))
        showMsg('Comprobante adjuntado ✓')
      } else {
        showMsg('Error subiendo comprobante', false)
      }
    } finally {
      setUploadingComp(false)
    }
  }

  function openEdit(p: Payment) {
    setEditPay(p)
    setForm({
      lead_id: p.lead_id,
      amount: String(p.amount),
      method: p.method,
      description: p.description ?? '',
      fecha: p.fecha.slice(0, 10),
      status: p.status,
      comprobante_url: p.comprobante_url ?? '',
      payment_month: p.payment_month ?? hoy.mes,
      due_date: p.due_date?.slice(0, 10) ?? '',
      payment_number: String(p.payment_number ?? ''),
    })
    setShowForm(true)
  }

  function openNew() {
    setEditPay(null)
    setForm({
      lead_id: '',
      amount: '',
      method: 'transferencia',
      description: '',
      fecha: hoy.fecha,
      status: 'pagado',
      comprobante_url: '',
      payment_month: hoy.mes,
      due_date: '',
      payment_number: '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lead_id || !form.amount) return

    setSaving(true)
    try {
      const body = {
        ...form,
        amount: parseFloat(form.amount),
        payment_number: form.payment_number ? parseInt(form.payment_number) : null,
        due_date: form.due_date || null,
      }

      if (editPay) {
        const res = await fetch(`/api/admin/payments/${editPay.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok) {
          setPayments((prev) =>
            prev.map((p) =>
              p.id === editPay.id
                ? {
                    ...p,
                    ...body,
                    amount: parseFloat(form.amount),
                    lead: p.lead,
                  }
                : p
            )
          )
          showMsg('Pago actualizado ✓')
        } else {
          showMsg(data.error ?? 'Error', false)
        }
      } else {
        const res = await fetch('/api/admin/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.payment) {
          const lead = leads.find((l) => l.id === form.lead_id)
          setPayments((prev) => [
            {
              ...data.payment,
              lead: lead
                ? {
                    nombre: lead.nombre,
                    folio: lead.folio,
                    servicio: lead.servicio,
                    estimated_value: lead.estimated_value,
                    contract_value: lead.contract_value,
                  }
                : null,
            },
            ...prev,
          ])
          showMsg('Pago registrado ✓')
        } else {
          showMsg(data.error ?? 'Error', false)
        }
      }

      setShowForm(false)
      setEditPay(null)
      setForm({
        lead_id: '',
        amount: '',
        method: 'transferencia',
        description: '',
        fecha: hoy.fecha,
        status: 'pagado',
        comprobante_url: '',
        payment_month: hoy.mes,
        due_date: '',
        payment_number: '',
      })
    } finally {
      setSaving(false)
    }
  }

  async function deletePay(id: string) {
    if (!confirm('¿Eliminar este pago?')) return
    const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPayments((prev) => prev.filter((p) => p.id !== id))
      showMsg('Pago eliminado')
    } else {
      showMsg('Error eliminando', false)
    }
  }

  // ─── Export ────────────────────────────────────────────────────

  function exportarCSV() {
    if (payments.length === 0) {
      showMsg('No hay registros para exportar', false)
      return
    }
    const headers = [
      'Cliente',
      'Servicio',
      'Folio',
      'Valor Total',
      'Pago 1',
      'Fecha Pago 1',
      'Pago 2',
      'Fecha Pago 2',
      'Total Pagado',
      'Pendiente',
      'Estado',
      'Método',
      'Mes',
      'Descripción',
      'Fecha Registro',
    ]
    const rows = payments.map((p) => {
      const leadPayments = payments.filter((x) => x.lead_id === p.lead_id)
      const pagado = leadPayments
        .filter((x) => x.status === 'pagado')
        .reduce((s, x) => s + x.amount, 0)
      const contractVal = p.lead?.contract_value ?? p.lead?.estimated_value ?? 0
      return [
        p.lead?.nombre ?? '—',
        p.lead?.servicio ?? '',
        p.lead?.folio ?? '',
        contractVal,
        p.payment_number === 1 ? p.amount : '',
        p.payment_number === 1 ? p.fecha : '',
        p.payment_number === 2 ? p.amount : '',
        p.payment_number === 2 ? p.fecha : '',
        pagado,
        Math.max(contractVal - pagado, 0),
        p.status,
        METHOD_LABELS[p.method] ?? p.method,
        p.payment_month ?? '',
        p.description ?? '',
        new Date(p.fecha).toLocaleDateString('es-EC'),
      ]
    })

    let csv = '\ufeff' + headers.join(',') + '\n'
    rows.forEach((row) => {
      csv += row.map((c) => `"${c}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finanzas_${hoy.mes.replace(' ', '_')}.csv`
    link.click()
    showMsg('CSV descargado ✓')
  }

  function exportarXLS() {
    if (payments.length === 0) {
      showMsg('No hay registros para exportar', false)
      return
    }
    // @ts-ignore
    const XLSX = window.XLSX
    if (!XLSX) {
      showMsg('Cargando librería Excel...', false)
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
      script.onload = () => exportarXLS()
      document.head.appendChild(script)
      return
    }

    const data = payments.map((p) => {
      const leadPayments = payments.filter((x) => x.lead_id === p.lead_id)
      const pagado = leadPayments
        .filter((x) => x.status === 'pagado')
        .reduce((s, x) => s + x.amount, 0)
      const contractVal = p.lead?.contract_value ?? p.lead?.estimated_value ?? 0
      return {
        Cliente: p.lead?.nombre ?? '—',
        Servicio: p.lead?.servicio ?? '',
        Folio: p.lead?.folio ?? '',
        'Valor Total': contractVal,
        'Pago 1': p.payment_number === 1 ? p.amount : '',
        'Fecha Pago 1': p.payment_number === 1 ? fmtDate(p.fecha) : '',
        'Pago 2': p.payment_number === 2 ? p.amount : '',
        'Fecha Pago 2': p.payment_number === 2 ? fmtDate(p.fecha) : '',
        'Total Pagado': pagado,
        Pendiente: Math.max(contractVal - pagado, 0),
        Estado: p.status,
        Método: METHOD_LABELS[p.method] ?? p.method,
        'Mes de Pago': p.payment_month ?? '',
        Descripción: p.description ?? '',
        'Fecha Registro': fmtDate(p.fecha),
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos')
    XLSX.writeFile(wb, `finanzas_${hoy.mes.replace(' ', '_')}.xlsx`)
    showMsg('Excel descargado ✓')
  }

  // ─── Styles ────────────────────────────────────────────────────

  const cardHeader = {
    padding: '20px 24px',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    color: 'white',
  } as React.CSSProperties

  const cardBody = { padding: '24px' } as React.CSSProperties

  const inp = {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#f8fafc',
    transition: 'all 0.2s',
  } as React.CSSProperties

  const lbl = {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color: '#64748b',
    display: 'block',
    marginBottom: '6px',
  } as React.CSSProperties

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
            color: toast.ok ? '#15803d' : '#dc2626',
            padding: '14px 22px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#00113a', margin: 0 }}>
          💰 Sistema Contable
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>
          Gestión de pagos, contratos y facturación en tiempo real
        </p>
        <div
          style={{
            display: 'inline-block',
            marginTop: 10,
            padding: '6px 16px',
            background: 'linear-gradient(135deg, #667eea20, #764ba220)',
            border: '1px solid #667eea40',
            borderRadius: 50,
            fontSize: 12,
            fontWeight: 700,
            color: '#5b21b6',
          }}
        >
          📅 {hoy.mes}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            icon: '💵',
            label: 'Monto Total Contratos',
            value: fmtMoney(totalContratos),
            bg: 'linear-gradient(135deg, #667eea18, #764ba218)',
            border: '#667eea30',
            color: '#5b21b6',
          },
          {
            icon: '✅',
            label: 'Total Pagado',
            value: fmtMoney(ingresoTotal),
            bg: 'linear-gradient(135deg, #10b98118, #05966918)',
            border: '#10b98130',
            color: '#059669',
          },
          {
            icon: '⏳',
            label: 'Por Cobrar',
            value: fmtMoney(pendienteTotal),
            bg: 'linear-gradient(135deg, #f59e0b18, #d9770618)',
            border: '#f59e0b30',
            color: '#d97706',
          },
          {
            icon: '👥',
            label: 'Clientes Activos',
            value: String(Object.keys(byLead).length),
            bg: 'linear-gradient(135deg, #3b82f618, #2563eb18)',
            border: '#3b82f630',
            color: '#2563eb',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '22px 24px',
              border: `1px solid ${kpi.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: kpi.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                marginBottom: 12,
              }}
            >
              {kpi.icon}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#94a3b8',
                marginBottom: 6,
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: kpi.color,
                letterSpacing: '-0.5px',
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 24,
        }}
      >
        {/* Form Panel */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            height: 'fit-content',
          }}
        >
          <div style={cardHeader}>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: 0,
              }}
            >
              📝 {editPay ? 'Editar Pago' : 'Registrar Nuevo Pago'}
            </h2>
            <p
              style={{
                fontSize: '0.85rem',
                opacity: 0.8,
                margin: '4px 0 0',
              }}
            >
              {editPay ? 'Modifica los datos del pago' : 'Complete los datos del contrato'}
            </p>
          </div>
          <div style={cardBody}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>👤 Cliente *</label>
                <select
                  value={form.lead_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lead_id: e.target.value }))
                  }
                  style={inp}
                  required
                  disabled={!!editPay}
                >
                  <option value="">Seleccionar cliente…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                      {l.folio ? ` (${l.folio})` : ''}
                      {l.contract_value
                        ? ` — ${fmtMoney(l.contract_value)}`
                        : ''}
                    </option>
                  ))}
                </select>
                {form.lead_id && (() => {
                  const lead = leads.find((l) => l.id === form.lead_id)
                  const cv = lead?.contract_value ?? lead?.estimated_value
                  if (!cv) return null
                  const paid = payments
                    .filter(
                      (p) =>
                        p.lead_id === form.lead_id && p.status === 'pagado'
                    )
                    .reduce((s, p) => s + p.amount, 0)
                  return (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 10,
                        fontSize: 12,
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      Contrato:{' '}
                      <strong style={{ color: '#00113a' }}>
                        {fmtMoney(cv)}
                      </strong>{' '}
                      · Cobrado:{' '}
                      <strong style={{ color: '#10b981' }}>
                        {fmtMoney(paid)}
                      </strong>{' '}
                      · Falta:{' '}
                      <strong style={{ color: '#d97706' }}>
                        {fmtMoney(Math.max(cv - paid, 0))}
                      </strong>
                    </div>
                  )
                })()}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>💰 Monto del Pago (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  style={inp}
                  required
                  placeholder="0.00"
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={lbl}>💳 Método</label>
                  <select
                    value={form.method}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, method: e.target.value }))
                    }
                    style={inp}
                  >
                    {Object.entries(METHOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>📊 Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, status: e.target.value }))
                    }
                    style={inp}
                  >
                    <option value="pagado">✓ Pagado</option>
                    <option value="pendiente">⏳ Pendiente</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={lbl}>🔢 Nº Cuota</label>
                  <input
                    type="number"
                    min="1"
                    value={form.payment_number}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        payment_number: e.target.value,
                      }))
                    }
                    style={inp}
                    placeholder="1=Anticipo"
                  />
                </div>
                <div>
                  <label style={lbl}>📅 Fecha de Pago</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fecha: e.target.value }))
                    }
                    style={inp}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>📆 Mes del Pago</label>
                <input
                  type="text"
                  value={form.payment_month}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      payment_month: e.target.value,
                    }))
                  }
                  style={inp}
                  placeholder={hoy.mes}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginTop: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  {MESES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          payment_month: `${m} ${hoy.anio}`,
                        }))
                      }
                      style={{
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: form.payment_month?.startsWith(m)
                          ? '#00113a'
                          : '#f8fafc',
                        color: form.payment_month?.startsWith(m)
                          ? '#fff'
                          : '#64748b',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>📅 Fecha Límite</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, due_date: e.target.value }))
                  }
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>📝 Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Ej: Anticipo 50% · $275 de $550"
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>📎 Comprobante</label>
                {form.comprobante_url ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: '#eff6ff',
                      borderRadius: 10,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <a
                      href={form.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#2552ca',
                        textDecoration: 'none',
                        fontWeight: 700,
                      }}
                    >
                      Ver comprobante ↗
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, comprobante_url: '' }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      × Quitar
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => compInputRef.current?.click()}
                    style={{
                      border: '2px dashed #e2e8f0',
                      borderRadius: 10,
                      padding: '14px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      fontSize: 12,
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {uploadingComp
                      ? '⏳ Subiendo…'
                      : '📎 Adjuntar comprobante de pago'}
                  </div>
                )}
                <input
                  ref={compInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadComprobante(f)
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {saving
                  ? '⏳ Guardando…'
                  : editPay
                    ? '💾 Actualizar Pago'
                    : '💾 Guardar Registro'}
              </button>

              {editPay && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditPay(null)
                    setForm({
                      lead_id: '',
                      amount: '',
                      method: 'transferencia',
                      description: '',
                      fecha: hoy.fecha,
                      status: 'pagado',
                      comprobante_url: '',
                      payment_month: hoy.mes,
                      due_date: '',
                      payment_number: '',
                    })
                  }}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    padding: '12px',
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 12,
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Table Panel */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={cardHeader}>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: 0,
              }}
            >
              📋 Historial de Pagos
            </h2>
            <p
              style={{
                fontSize: '0.85rem',
                opacity: 0.8,
                margin: '4px 0 0',
              }}
            >
              {filteredPayments.length} registro
              {filteredPayments.length !== 1 ? 's' : ''} encontrado
              {filteredPayments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={cardBody}>
            {/* Filters */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="🔍 Buscar cliente..."
                style={{
                  ...inp,
                  minWidth: 220,
                  paddingLeft: 40,
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {['todos', 'pagado', 'pendiente'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 50,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '2px solid',
                      cursor: 'pointer',
                      background:
                        filterStatus === s ? '#00113a' : 'white',
                      color:
                        filterStatus === s ? 'white' : '#64748b',
                      borderColor:
                        filterStatus === s ? '#00113a' : '#e2e8f0',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={exportarCSV}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                }}
              >
                📄 Exportar CSV
              </button>
              <button
                onClick={exportarXLS}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                }}
              >
                📊 Exportar Excel
              </button>
            </div>

            {/* Table */}
            <div
              style={{
                overflowX: 'auto',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.85rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                      color: 'white',
                    }}
                  >
                    {[
                      '#',
                      'Cliente',
                      'Monto',
                      'Estado',
                      'Método',
                      'Fecha',
                      'Límite',
                      'Mes',
                      'Progreso',
                      'Acciones',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '14px 12px',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#94a3b8',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '3.5rem',
                              marginBottom: 16,
                              opacity: 0.4,
                            }}
                          >
                            📭
                          </div>
                          <h3
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              color: '#64748b',
                              marginBottom: 8,
                            }}
                          >
                            Sin registros
                          </h3>
                          <p style={{ fontSize: '0.9rem' }}>
                            {filterSearch || filterStatus !== 'todos'
                              ? 'No hay resultados para los filtros aplicados'
                              : 'Agrega tu primer pago usando el formulario'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const ec =
                        ESTADO_COLORS[p.status] ?? ESTADO_COLORS.pendiente
                      const vencido =
                        mounted &&
                        p.due_date &&
                        new Date(p.due_date) < new Date() &&
                        p.status !== 'pagado'

                      // Calculate progress for this lead
                      const leadPayments = payments.filter(
                        (x) => x.lead_id === p.lead_id
                      )
                      const pagadoLead = leadPayments
                        .filter((x) => x.status === 'pagado')
                        .reduce((s, x) => s + x.amount, 0)
                      const contractVal =
                        p.lead?.contract_value ??
                        p.lead?.estimated_value ??
                        0
                      const pct =
                        contractVal > 0
                          ? Math.min((pagadoLead / contractVal) * 100, 100)
                          : 0

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = '#fafbff')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'transparent')
                          }
                        >
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '0.75rem',
                              color: '#94a3b8',
                              fontWeight: 800,
                            }}
                          >
                            {p.payment_number
                              ? `#${p.payment_number}`
                              : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: '#0f172a',
                              }}
                            >
                              {p.lead?.nombre ?? '—'}
                            </div>
                            {p.lead?.folio && (
                              <div
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#94a3b8',
                                  fontFamily: 'monospace',
                                  marginTop: 2,
                                }}
                              >
                                {p.lead.folio}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '1rem',
                              fontWeight: 900,
                              color:
                                p.status === 'pagado'
                                  ? '#10b981'
                                  : '#d97706',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fmtMoney(p.amount)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 12px',
                                borderRadius: 50,
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                background: ec.bg,
                                color: ec.text,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: ec.dot,
                                }}
                              />
                              {ec.label}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '0.8rem',
                              color: '#475569',
                            }}
                          >
                            {METHOD_LABELS[p.method] ?? p.method}
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '0.8rem',
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                            }}
                          >
                            {fmtDate(p.fecha)}
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              color: vencido ? '#ef4444' : '#64748b',
                              fontWeight: vencido ? 800 : 400,
                            }}
                          >
                            {p.due_date ? fmtDate(p.due_date) : '—'}
                            {vencido && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  marginLeft: 4,
                                  fontWeight: 800,
                                }}
                              >
                                ⚠️ VENCIDO
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '0.8rem',
                              color: '#475569',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.payment_month ?? '—'}
                          </td>
                          <td style={{ padding: '12px', minWidth: 100 }}>
                            {contractVal > 0 && (
                              <>
                                <div
                                  style={{
                                    height: 6,
                                    background: '#f1f5f9',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${pct}%`,
                                      background:
                                        pct >= 100
                                          ? 'linear-gradient(90deg, #10b981, #059669)'
                                          : 'linear-gradient(90deg, #f59e0b, #d97706)',
                                      borderRadius: 3,
                                      transition: 'width 0.5s',
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    marginTop: 4,
                                  }}
                                >
                                  {Math.round(pct)}% del contrato
                                </div>
                              </>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div
                              style={{ display: 'flex', gap: 6 }}
                            >
                              <button
                                onClick={() => openEdit(p)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color: '#2563eb',
                                  background: '#eff6ff',
                                  border: 'none',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    '#2563eb'
                                  e.currentTarget.style.color = 'white'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    '#eff6ff'
                                  e.currentTarget.style.color =
                                    '#2563eb'
                                }}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => deletePay(p.id)}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color: '#dc2626',
                                  background: '#fef2f2',
                                  border: 'none',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    '#dc2626'
                                  e.currentTarget.style.color = 'white'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    '#fef2f2'
                                  e.currentTarget.style.color =
                                    '#dc2626'
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

      {/* Client Progress Section */}
      {Object.keys(byLead).length > 0 && (
        <div
          style={{
            marginTop: 24,
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div style={cardHeader}>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                margin: 0,
              }}
            >
              📊 Progreso por Cliente
            </h2>
          </div>
          <div style={cardBody}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {Object.entries(byLead).map(([lid, info]) => {
                const cv = info.contractValue
                const pct =
                  cv && cv > 0
                    ? Math.min((info.pagado / cv) * 100, 100)
                    : 0
                return (
                  <div
                    key={lid}
                    style={{
                      padding: '16px 20px',
                      background: '#f8fafc',
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: '#0f172a',
                          }}
                        >
                          {info.nombre}
                        </span>
                        {info.folio && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              color: '#94a3b8',
                              marginLeft: 8,
                            }}
                          >
                            ({info.folio})
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          fontSize: '0.85rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            color: '#10b981',
                            fontWeight: 800,
                          }}
                        >
                          Cobrado: {fmtMoney(info.pagado)}
                        </span>
                        {cv && (
                          <span style={{ color: '#64748b' }}>
                            / {fmtMoney(cv)} acordado
                          </span>
                        )}
                        {cv && info.pagado < cv && (
                          <span
                            style={{
                              color: '#d97706',
                              fontWeight: 800,
                            }}
                          >
                            Falta: {fmtMoney(cv - info.pagado)}
                          </span>
                        )}
                      </div>
                    </div>
                    {cv && cv > 0 && (
                      <div
                        style={{
                          height: 10,
                          background: '#e2e8f0',
                          borderRadius: 5,
                          overflow: 'hidden',
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background:
                              pct >= 100
                                ? 'linear-gradient(90deg, #10b981, #059669)'
                                : 'linear-gradient(90deg, #667eea, #764ba2)',
                            borderRadius: 5,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      {info.payments
                        .sort(
                          (a, b) =>
                            (a.payment_number ?? 99) -
                            (b.payment_number ?? 99)
                        )
                        .map((p) => (
                          <span
                            key={p.id}
                            onClick={() => openEdit(p)}
                            title="Clic para editar"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 12px',
                              borderRadius: 50,
                              background:
                                p.status === 'pagado'
                                  ? '#dcfce7'
                                  : '#fef3c7',
                              color:
                                p.status === 'pagado'
                                  ? '#166534'
                                  : '#92400e',
                              fontWeight: 800,
                              border: `1px solid ${p.status === 'pagado' ? '#bbf7d0' : '#fde68a'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform =
                                'scale(1.05)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform =
                                'scale(1)'
                            }}
                          >
                            {p.payment_month ||
                              `Pago ${p.payment_number ?? ''}`}{' '}
                            · {fmtMoney(p.amount)}
                          </span>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      <div
        style={{
          marginTop: 24,
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div style={cardHeader}>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              margin: 0,
            }}
          >
            📈 Flujo Mensual de Ingresos
          </h2>
        </div>
        <div style={cardBody}>
          {mounted ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 16,
                height: 120,
                padding: '10px 0',
              }}
            >
              {Object.entries(mesesChart).map(([mes, val]) => {
                const pct = (val / maxMes) * 100
                const label = new Date(
                  mes + '-02'
                ).toLocaleDateString('es-EC', {
                  month: 'short',
                })
                return (
                  <div
                    key={mes}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      height: '100%',
                    }}
                  >
                    {val > 0 && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 800,
                        }}
                      >
                        ${Math.round(val)}
                      </div>
                    )}
                    <div
                      style={{
                        flex: 1,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          background:
                            val > 0
                              ? 'linear-gradient(180deg, #667eea, #764ba2)'
                              : '#e2e8f0',
                          borderRadius: '6px 6px 0 0',
                          height: `${Math.max(pct, 4)}%`,
                          transition: 'height 0.5s ease',
                          minHeight: 4,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              style={{
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{ fontSize: '0.85rem', color: '#94a3b8' }}
              >
                Cargando…
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}