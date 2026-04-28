'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

// ─── Types ─────────────────────────────────────────────────────────

type Installment = {
  id?: string
  amount: string
  payment_date: string
  status: 'pagado' | 'pendiente' | 'vencido'
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
  vencido:    { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: '❌ Vencido' },
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

// ─── Component ─────────────────────────────────────────────────────

export default function FinanzasClient({
  payments: initPayments,
  leads,
}: {
  payments: PaymentParent[]
  leads: Lead[]
}) {
  const [payments, setPayments] = useState<PaymentParent[]>(initPayments)
  const [showForm, setShowForm] = useState(false)
  const [editPay, setEditPay] = useState<PaymentParent | null>(null)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterSearch, setFilterSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

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
    contract_value: '',
    description: '',
    payment_month: '',
    status: 'activo',
    installments: [] as Installment[],
  })

  useEffect(() => {
    if (mounted && !editPay) {
      setForm((f) => ({
        ...f,
        installments: f.installments.length > 0 ? f.installments : [
          { amount: '', payment_date: hoy.fecha, status: 'pendiente', payment_number: 1 },
          { amount: '', payment_date: hoy.fecha, status: 'pendiente', payment_number: 2 },
        ]
      }))
    }
  }, [mounted, hoy.fecha, editPay])

  // ─── Computed ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalContratos = payments.reduce((s, p) => s + (p.contract_value || 0), 0)
    const totalPagado = payments.reduce((s, p) => {
      return s + p.installments.filter(i => i.status === 'pagado').reduce((sum, i) => sum + (parseFloat(i.amount as any) || 0), 0)
    }, 0)
    const totalPendiente = payments.reduce((s, p) => {
      return s + p.installments.filter(i => i.status === 'pendiente').reduce((sum, i) => sum + (parseFloat(i.amount as any) || 0), 0)
    }, 0)
    const clientesActivos = new Set(payments.map(p => p.lead_id)).size

    return { totalContratos, totalPagado, totalPendiente, clientesActivos }
  }, [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchStatus = filterStatus === 'todos' || 
        (filterStatus === 'pagado' && p.installments.some(i => i.status === 'pagado')) ||
        (filterStatus === 'pendiente' && p.installments.some(i => i.status === 'pendiente'))
      
      const search = filterSearch.toLowerCase()
      const matchSearch = !search ||
        (p.lead?.nombre ?? '').toLowerCase().includes(search) ||
        (p.lead?.folio ?? '').toLowerCase().includes(search)
      
      return matchStatus && matchSearch
    })
  }, [payments, filterStatus, filterSearch])

  // ─── Actions ───────────────────────────────────────────────────

  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function addInstallment() {
    setForm(prev => ({
      ...prev,
      installments: [
        ...prev.installments,
        {
          amount: '',
          payment_date: hoy.fecha,
          status: 'pendiente',
          payment_number: prev.installments.length + 1,
        }
      ]
    }))
  }

  function removeInstallment(index: number) {
    setForm(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, payment_number: i + 1 }))
    }))
  }

  function updateInstallment(index: number, field: keyof Installment, value: any) {
    setForm(prev => ({
      ...prev,
      installments: prev.installments.map((inst, i) => 
        i === index ? { ...inst, [field]: value } : inst
      )
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
      } else {
        showMsg('Error subiendo comprobante', false)
      }
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
      })),
    })
    setShowForm(true)
  }

  function openNew() {
    setEditPay(null)
    setForm({
      lead_id: '',
      contract_value: '',
      description: '',
      payment_month: hoy.mes,
      status: 'activo',
      installments: [
        { amount: '', payment_date: hoy.fecha, status: 'pendiente', payment_number: 1 },
        { amount: '', payment_date: hoy.fecha, status: 'pendiente', payment_number: 2 },
      ],
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
          id: inst.id, // Incluir ID si existe para edición
        })),
      }

      if (editPay) {
        const res = await fetch(`/api/admin/payments/${editPay.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        
        if (res.ok) {
          // Refrescar datos
          const refreshRes = await fetch('/api/admin/payments')
          const refreshData = await refreshRes.json()
          setPayments(refreshData.payments || [])
          showMsg('Contrato actualizado ✓')
          setShowForm(false)
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
        
        if (res.ok && data.parent) {
          setPayments(prev => [data.parent, ...prev])
          showMsg('Contrato registrado ✓')
          setShowForm(false)
        } else {
          showMsg(data.error ?? 'Error', false)
        }
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
      'Cliente', 'Folio', 'Valor Contrato', 'Cuota #', 'Monto Cuota',
      'Fecha Cuota', 'Estado Cuota', 'Comprobante', 'Descripción', 'Mes'
    ]
    
    const rows: any[] = []
    payments.forEach(p => {
      p.installments.forEach(inst => {
        rows.push([
          p.lead?.nombre ?? '—',
          p.lead?.folio ?? '',
          p.contract_value,
          inst.payment_number,
          inst.amount,
          inst.payment_date,
          inst.status,
          inst.receipt_url ?? '',
          p.description ?? '',
          p.payment_month ?? '',
        ])
      })
    })

    let csv = '\ufeff' + headers.join(',') + '\n'
    rows.forEach(row => {
      csv += row.map((c: any) => `"${c}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finanzas_${hoy.mes.replace(' ', '_')}.csv`
    link.click()
    showMsg('CSV descargado ✓')
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
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '14px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#00113a', margin: 0 }}>
          💰 Sistema Contable
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>
          Gestión de contratos y cuotas en tiempo real
        </p>
        <div style={{
          display: 'inline-block', marginTop: 10, padding: '6px 16px',
          background: 'linear-gradient(135deg, #667eea20, #764ba220)',
          border: '1px solid #667eea40', borderRadius: 50,
          fontSize: 12, fontWeight: 700, color: '#5b21b6',
        }}>
          📅 {hoy.mes}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { icon: '💵', label: 'Monto Total Contratos', value: fmtMoney(stats.totalContratos), color: '#5b21b6' },
          { icon: '✅', label: 'Total Pagado', value: fmtMoney(stats.totalPagado), color: '#059669' },
          { icon: '⏳', label: 'Por Cobrar', value: fmtMoney(stats.totalPendiente), color: '#d97706' },
          { icon: '👥', label: 'Clientes Activos', value: String(stats.clientesActivos), color: '#2563eb' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 16, padding: '22px 24px',
            border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${kpi.color}18`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', marginBottom: 12,
            }}>
              {kpi.icon}
            </div>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '1px', color: '#94a3b8', marginBottom: 6,
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '1.6rem', fontWeight: 900, color: kpi.color, letterSpacing: '-0.5px',
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24 }}>
        
        {/* Form Panel */}
        <div style={{
          background: 'white', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden', border: '1px solid #e2e8f0',
          height: 'fit-content',
        }}>
          <div style={cardHeader}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              📝 {editPay ? 'Editar Contrato' : 'Nuevo Contrato'}
            </h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: '4px 0 0' }}>
              {editPay ? 'Modifica los datos del contrato' : 'Registra un contrato con sus cuotas'}
            </p>
          </div>
          <div style={{ ...cardBody, maxHeight: '80vh', overflowY: 'auto' }}>
            <form onSubmit={handleSubmit}>
              
              {/* Cliente */}
              <div style={{ marginBottom: 16 }}>
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
                      {l.nombre} {l.folio ? `(${l.folio})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor Contrato */}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>💰 Valor Total del Contrato (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.contract_value}
                  onChange={(e) => setForm(p => ({ ...p, contract_value: e.target.value }))}
                  style={inp}
                  required
                  placeholder="0.00"
                />
              </div>

              {/* Mes del Pago */}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>📆 Mes de Referencia</label>
                <input
                  type="text"
                  value={form.payment_month}
                  onChange={(e) => setForm(p => ({ ...p, payment_month: e.target.value }))}
                  style={inp}
                  placeholder={hoy.mes}
                />
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {MESES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, payment_month: `${m} ${hoy.anio}` }))}
                      style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 8,
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
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>📝 Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Proyecto web - 50% anticipo"
                  style={inp}
                />
              </div>

              {/* Cuotas Dinámicas */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>📋 Cuotas del Contrato</label>
                  <button
                    type="button"
                    onClick={addInstallment}
                    style={{
                      padding: '6px 12px', background: '#00113a', color: 'white',
                      border: 'none', borderRadius: 8, fontSize: '0.8rem',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    + Añadir cuota
                  </button>
                </div>

                {form.installments.map((inst, index) => (
                  <div key={index} style={{
                    background: '#f8fafc', borderRadius: 12,
                    border: '1px solid #e2e8f0', padding: '14px',
                    marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00113a' }}>
                        Cuota #{inst.payment_number}
                      </span>
                      {form.installments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInstallment(index)}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ ...lbl, fontSize: '0.6rem' }}>Monto (USD) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inst.amount}
                          onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                          style={{ ...inp, padding: '8px 10px' }}
                          required
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{ ...lbl, fontSize: '0.6rem' }}>Fecha de Pago *</label>
                        <input
                          type="date"
                          value={inst.payment_date}
                          onChange={(e) => updateInstallment(index, 'payment_date', e.target.value)}
                          style={{ ...inp, padding: '8px 10px' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ ...lbl, fontSize: '0.6rem' }}>Estado</label>
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
                        <label style={{ ...lbl, fontSize: '0.6rem' }}>Comprobante</label>
                        {inst.receipt_url ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', background: '#eff6ff',
                            borderRadius: 8, border: '1px solid #bfdbfe',
                          }}>
                            <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: '0.75rem', color: '#2552ca', fontWeight: 700 }}>
                              Ver ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => updateInstallment(index, 'receipt_url', null)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRefs.current[index]?.click()}
                            style={{
                              border: '2px dashed #e2e8f0', borderRadius: 8,
                              padding: '10px', textAlign: 'center', cursor: 'pointer',
                              background: '#f8fafc', fontSize: '0.75rem',
                              color: '#64748b', fontWeight: 600,
                            }}
                          >
                            {uploadingIndex === index ? '⏳ Subiendo…' : '📎 Adjuntar'}
                          </div>
                        )}
                        <input
                          ref={el => { fileInputRefs.current[index] = el }}
                          type="file"
                          accept="image/*,application/pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadComprobante(f, index)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: '0.95rem', fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                }}
              >
                {saving ? '⏳ Guardando…' : editPay ? '💾 Actualizar Contrato' : '💾 Guardar Contrato'}
              </button>

              {editPay && (
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditPay(null); }}
                  style={{
                    width: '100%', marginTop: 10, padding: '12px',
                    background: '#f1f5f9', color: '#64748b',
                    border: '1.5px solid #e2e8f0', borderRadius: 12,
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Table Panel */}
        <div style={{
          background: 'white', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden', border: '1px solid #e2e8f0',
        }}>
          <div style={cardHeader}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              📋 Historial de Contratos
            </h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: '4px 0 0' }}>
              {filteredPayments.length} contrato{filteredPayments.length !== 1 ? 's' : ''} encontrado{filteredPayments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={cardBody}>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="🔍 Buscar cliente..."
                style={{ ...inp, minWidth: 220, paddingLeft: 40 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {['todos', 'pagado', 'pendiente'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '8px 16px', borderRadius: 50,
                      fontSize: '0.8rem', fontWeight: 700, border: '2px solid',
                      cursor: 'pointer',
                      background: filterStatus === s ? '#00113a' : 'white',
                      color: filterStatus === s ? 'white' : '#64748b',
                      borderColor: filterStatus === s ? '#00113a' : '#e2e8f0',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={exportarCSV}
                style={{
                  padding: '10px 18px', background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: 10,
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                📄 Exportar CSV
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                    color: 'white',
                  }}>
                    {['Cliente', 'Contrato', 'Progreso', 'Cuotas', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{
                        padding: '14px 12px', textAlign: 'left',
                        fontSize: '0.7rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '1px',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                          <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: 0.4 }}>📭</div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
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
                      const todasPagadas = p.installments.every(i => i.status === 'pagado')
                      const algunaVencida = p.installments.some(i => 
                        i.status === 'pendiente' && i.payment_date && new Date(i.payment_date) < new Date()
                      )

                      return (
                        <tr key={p.id} style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                              {p.lead?.nombre ?? '—'}
                            </div>
                            {p.lead?.folio && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {p.lead.folio}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                              {p.payment_month}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00113a' }}>
                              {fmtMoney(p.contract_value)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {p.installments.length} cuota(s)
                            </div>
                          </td>
                          <td style={{ padding: '12px', minWidth: 120 }}>
                            <div style={{
                              height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: pct >= 100 
                                  ? 'linear-gradient(90deg, #10b981, #059669)' 
                                  : 'linear-gradient(90deg, #667eea, #764ba2)',
                                borderRadius: 4, transition: 'width 0.5s',
                              }} />
                            </div>
                            <div style={{
                              fontSize: '0.7rem', fontWeight: 700,
                              color: '#94a3b8', marginTop: 4,
                            }}>
                              {Math.round(pct)}% · {fmtMoney(pagado)} pagado
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {p.installments.sort((a, b) => a.payment_number - b.payment_number).map(inst => {
                                const ec = ESTADO_COLORS[inst.status] ?? ESTADO_COLORS.pendiente
                                const vencida = inst.status === 'pendiente' && inst.payment_date && new Date(inst.payment_date) < new Date()
                                
                                return (
                                  <div key={inst.id || inst.payment_number} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '4px 8px', borderRadius: 6,
                                    background: ec.bg, fontSize: '0.75rem',
                                  }}>
                                    <span style={{
                                      width: 6, height: 6, borderRadius: '50%', background: ec.dot,
                                    }} />
                                    <span style={{ fontWeight: 700, color: ec.text }}>
                                      #{inst.payment_number}: {fmtMoney(parseFloat(inst.amount as any))}
                                    </span>
                                    <span style={{ color: '#64748b' }}>
                                      {fmtDate(inst.payment_date)}
                                    </span>
                                    {vencida && (
                                      <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.65rem' }}>
                                        ⚠️ VENCIDO
                                      </span>
                                    )}
                                    {inst.receipt_url && (
                                      <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer"
                                        style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.7rem' }}>
                                        📎
                                      </a>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 12px', borderRadius: 50,
                              fontSize: '0.7rem', fontWeight: 800,
                              background: todasPagadas ? '#dcfce7' : algunaVencida ? '#fee2e2' : '#fef3c7',
                              color: todasPagadas ? '#166534' : algunaVencida ? '#991b1b' : '#92400e',
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: todasPagadas ? '#22c55e' : algunaVencida ? '#ef4444' : '#f59e0b',
                              }} />
                              {todasPagadas ? 'Completado' : algunaVencida ? 'Con vencidas' : 'En progreso'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => openEdit(p)}
                                style={{
                                  padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800,
                                  color: '#2563eb', background: '#eff6ff', border: 'none',
                                  borderRadius: 8, cursor: 'pointer',
                                }}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => deletePay(p.id)}
                                style={{
                                  padding: '6px 10px', fontSize: '0.75rem', fontWeight: 800,
                                  color: '#dc2626', background: '#fef2f2', border: 'none',
                                  borderRadius: 8, cursor: 'pointer',
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
    </div>
  )
}