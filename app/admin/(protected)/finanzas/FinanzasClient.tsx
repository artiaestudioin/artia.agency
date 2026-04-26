'use client'

import { useState, useRef } from 'react'

type Payment = {
  id: string; lead_id: string; amount: number; status: string; method: string
  description: string | null; fecha: string; comprobante_url?: string | null
  lead: { nombre: string; folio: string | null; servicio: string | null; estimated_value: number | null } | null
}
type Lead = { id: string; nombre: string; folio: string | null; servicio: string | null; estimated_value: number | null; payment_status: string | null }

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia', efectivo: 'Efectivo',
  tarjeta: 'Tarjeta', cheque: 'Cheque', otro: 'Otro',
}

function fmtMoney(n: number | null | undefined) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPaymentType(payment: Payment, allPayments: Payment[], total: number | null): string {
  const leadPayments = allPayments
    .filter(p => p.lead_id === payment.lead_id && p.status === 'pagado')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  const idx = leadPayments.findIndex(p => p.id === payment.id)
  if (idx === -1) return '—'
  if (idx === 0) return 'Anticipo'
  const sumUntilNow = leadPayments.slice(0, idx + 1).reduce((s, p) => s + p.amount, 0)
  if (total && total > 0 && sumUntilNow >= total) return 'Final'
  return 'Parcial'
}

export default function FinanzasClient({ payments: initPayments, leads }: { payments: Payment[]; leads: Lead[] }) {
  const [payments, setPayments] = useState(initPayments)
  const [leadsData, setLeadsData] = useState<Lead[]>(leads)
  const [showForm, setShowForm] = useState(false)
  const [editPay, setEditPay]   = useState<Payment | null>(null)
  const [filter, setFilter]     = useState('todos')
  const [saving, setSaving]     = useState(false)
  const [uploadingComp, setUploadingComp] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)

  // Estados para editar monto acordado
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [editValue, setEditValue]         = useState<string>('')

  const compInputRef = useRef<HTMLInputElement>(null)

  const emptyForm = { lead_id: '', amount: '', method: 'transferencia', description: '', fecha: new Date().toISOString().slice(0, 10), status: 'pagado', comprobante_url: '' }
  const [form, setForm] = useState(emptyForm)

  function showMsg(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // KPIs
  const ingresoTotal  = payments.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const ahora         = new Date()
  const mesKey        = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const ingresoMes    = payments.filter(p => p.status === 'pagado' && p.fecha.startsWith(mesKey)).reduce((s, p) => s + p.amount, 0)
  const pendienteTotal= payments.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.amount, 0)

  // Flujo mensual últimos 6
  const meses: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses[key] = 0
  }
  payments.filter(p => p.status === 'pagado').forEach(p => {
    const key = p.fecha.slice(0, 7)
    if (key in meses) meses[key] += p.amount
  })
  const maxMes = Math.max(...Object.values(meses), 1)

  const filtered = filter === 'todos' ? payments : payments.filter(p => p.status === filter)

  // Resumen por cliente
  const byLead: Record<string, { id: string; nombre: string; folio: string | null; pagado: number; pendiente: number; total: number | null }> = {}
  payments.forEach(p => {
    if (!byLead[p.lead_id]) byLead[p.lead_id] = {
      id: p.lead_id,
      nombre: p.lead?.nombre ?? '—', folio: p.lead?.folio ?? null,
      pagado: 0, pendiente: 0, total: p.lead?.estimated_value ?? null,
    }
    if (p.status === 'pagado')    byLead[p.lead_id].pagado   += p.amount
    if (p.status === 'pendiente') byLead[p.lead_id].pendiente += p.amount
  })
  // Asegurar leads sin pagos también aparezcan si tienen estimated_value
  leadsData.forEach(l => {
    if (!byLead[l.id] && (l.estimated_value ?? 0) > 0) {
      byLead[l.id] = { id: l.id, nombre: l.nombre, folio: l.folio, pagado: 0, pendiente: 0, total: l.estimated_value }
    }
  })

  // Info del cliente seleccionado en formulario
  const selectedLead = leadsData.find(l => l.id === form.lead_id)
  const selectedLeadPaid = payments.filter(p => p.lead_id === form.lead_id && p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const selectedLeadTotal = selectedLead?.estimated_value ?? 0
  const selectedLeadPending = Math.max(selectedLeadTotal - selectedLeadPaid, 0)

  // Subir comprobante
  async function uploadComprobante(file: File) {
    setUploadingComp(true)
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('bucket', 'comprobantes')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) { setForm(p => ({ ...p, comprobante_url: data.url })); showMsg('Comprobante subido ✓') }
      else showMsg('Error subiendo comprobante')
    } finally { setUploadingComp(false) }
  }

  function openEdit(p: Payment) {
    setEditPay(p)
    setForm({ lead_id: p.lead_id, amount: String(p.amount), method: p.method, description: p.description ?? '', fecha: p.fecha.slice(0, 10), status: p.status, comprobante_url: p.comprobante_url ?? '' })
    setShowForm(true)
  }

  function openNew() { setEditPay(null); setForm(emptyForm); setShowForm(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lead_id || !form.amount) return
    setSaving(true)
    try {
      const body = { ...form, amount: parseFloat(form.amount), lead_id: form.lead_id }
      if (editPay) {
        const res  = await fetch(`/api/admin/payments/${editPay.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        if (res.ok) {
          setPayments(prev => prev.map(p => p.id === editPay.id ? { ...p, ...body, amount: parseFloat(form.amount) } : p))
          showMsg('Pago actualizado ✓')
        } else showMsg(data.error ?? 'Error')
      } else {
        const res  = await fetch('/api/admin/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        if (res.ok && data.payment) {
          const lead = leadsData.find(l => l.id === form.lead_id)
          setPayments(prev => [{ ...data.payment, lead: lead ? { nombre: lead.nombre, folio: lead.folio, servicio: lead.servicio, estimated_value: lead.estimated_value } : null }, ...prev])
          showMsg('Pago registrado ✓')
        } else showMsg(data.error ?? 'Error')
      }
      setShowForm(false); setEditPay(null); setForm(emptyForm)
    } finally { setSaving(false) }
  }

  async function deletePay(id: string) {
    if (!confirm('¿Eliminar este pago?')) return
    const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' })
    if (res.ok) { setPayments(prev => prev.filter(p => p.id !== id)); showMsg('Pago eliminado') }
  }

  async function updateEstimatedValue(leadId: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) { showMsg('Monto inválido'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimated_value: val })
      })
      if (res.ok) {
        setLeadsData(prev => prev.map(l => l.id === leadId ? { ...l, estimated_value: val } : l))
        // Actualizar también en payments para que el resumen se recalcule
        setPayments(prev => prev.map(p => p.lead_id === leadId ? { ...p, lead: p.lead ? { ...p.lead, estimated_value: val } : null } : p))
        showMsg('Monto acordado actualizado ✓')
        setEditingLeadId(null)
      } else {
        const data = await res.json()
        showMsg(data.error ?? 'Error al actualizar')
      }
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
  }
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 5 }

  return (
    <div style={{ maxWidth: 1100 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#00113a', margin: 0 }}>Finanzas</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>Control de ingresos, montos acordados y cobros</p>
        </div>
        <button onClick={openNew} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Registrar pago
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#00113a', borderRadius: 14, padding: '22px 24px', color: '#fff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Ingresos totales</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px' }}>{fmtMoney(ingresoTotal)}</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>Este mes</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', letterSpacing: '-1px' }}>{fmtMoney(ingresoMes)}</div>
        </div>
        <div style={{ background: pendienteTotal > 0 ? '#fef9ec' : '#fff', border: `0.5px solid ${pendienteTotal > 0 ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>Por cobrar</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: pendienteTotal > 0 ? '#d97706' : '#10b981', letterSpacing: '-1px' }}>{fmtMoney(pendienteTotal)}</div>
        </div>
      </div>

      {/* Flujo mensual */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#00113a', marginBottom: 20 }}>Flujo mensual</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 90 }}>
          {Object.entries(meses).map(([mes, val]) => {
            const pct   = (val / maxMes) * 100
            const label = new Date(mes + '-01').toLocaleDateString('es-EC', { month: 'short' })
            return (
              <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                {val > 0 && <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>${Math.round(val)}</div>}
                <div style={{ flex: 1, width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', background: val > 0 ? '#2552ca' : '#e2e8f0', borderRadius: '4px 4px 0 0', height: `${Math.max(pct, 3)}%`, transition: 'height 0.4s' }} />
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumen por cliente */}
      {Object.keys(byLead).length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#00113a', marginBottom: 16 }}>Resumen por cliente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(byLead).map(([lid, info]) => {
              const pct = info.total ? Math.min((info.pagado / info.total) * 100, 100) : 0
              const isEditing = editingLeadId === lid
              return (
                <div key={lid} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{info.nombre}</span>
                      <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {isEditing ? (
                          <>
                            <input
                              type="number" step="0.01" min="0"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              style={{ width: 110, padding: '5px 8px', border: '0.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none' }}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') updateEstimatedValue(lid); if (e.key === 'Escape') setEditingLeadId(null) }}
                            />
                            <button onClick={() => updateEstimatedValue(lid)} style={{ fontSize: 11, background: '#00113a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 700 }}>✓</button>
                            <button onClick={() => setEditingLeadId(null)} style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>{fmtMoney(info.pagado)}</span>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <button
                              onClick={() => { setEditingLeadId(lid); setEditValue(String(info.total ?? 0)) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: '#2552ca', fontWeight: 700, padding: 0, fontSize: 12 }}
                              title="Editar monto acordado"
                            >
                              {fmtMoney(info.total)}
                            </button>
                            {info.pendiente > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}>+{fmtMoney(info.pendiente)} pendiente</span>}
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>(clic para editar total)</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#2552ca', borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#00113a', margin: 0 }}>
              {editPay ? 'Editar pago' : 'Registrar pago'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditPay(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Cliente *</label>
                <select value={form.lead_id} onChange={e => setForm(p => ({ ...p, lead_id: e.target.value }))} style={inp} required>
                  <option value="">Seleccionar…</option>
                  {leadsData.map(l => <option key={l.id} value={l.id}>{l.nombre}{l.folio ? ` (${l.folio})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Monto (USD) *</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={inp} required placeholder="0.00" />
              </div>

              {/* Info contextual del cliente seleccionado */}
              {form.lead_id && selectedLead && (
                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Monto acordado</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#00113a' }}>{fmtMoney(selectedLeadTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Pagado hasta ahora</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>{fmtMoney(selectedLeadPaid)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Pendiente</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: selectedLeadPending > 0 ? '#d97706' : '#10b981' }}>{fmtMoney(selectedLeadPending)}</div>
                  </div>
                  {selectedLeadPending > 0 && (
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                      {parseFloat(form.amount || '0') > selectedLeadPending ? '⚠️ El monto supera el pendiente' : `Puedes registrar hasta ${fmtMoney(selectedLeadPending)}`}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={lbl}>Método</label>
                <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} style={inp}>
                  {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inp}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="ej: Anticipo 50%" style={inp} />
              </div>
            </div>

            {/* Comprobante */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Comprobante de pago</label>
              {form.comprobante_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a href={form.comprobante_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>
                    Ver comprobante ↗
                  </a>
                  <button type="button" onClick={() => setForm(p => ({ ...p, comprobante_url: '' }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
                    × Quitar
                  </button>
                </div>
              ) : (
                <div onClick={() => compInputRef.current?.click()} style={{ border: '1.5px dashed #e2e8f0', borderRadius: 8, padding: '12px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
                  {uploadingComp ? 'Subiendo…' : '📎 Haz clic para adjuntar imagen del comprobante'}
                </div>
              )}
              <input ref={compInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadComprobante(f) }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Guardando…' : editPay ? 'Actualizar pago' : 'Registrar pago'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditPay(null) }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla pagos */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#00113a' }}>Historial de pagos</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos', 'pagado', 'pendiente'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '0.5px solid #e2e8f0', cursor: 'pointer',
                background: filter === s ? '#00113a' : '#fff', color: filter === s ? '#fff' : '#64748b',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Cliente', 'Monto', 'Estado', 'Método', 'Tipo', 'Descripción', 'Comprobante', 'Fecha', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '0.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const pType = getPaymentType(p, payments, p.lead?.estimated_value ?? null)
              return (
                <tr key={p.id} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.lead?.nombre ?? '—'}</div>
                    {p.lead?.folio && <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{p.lead.folio}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: p.status === 'pagado' ? '#10b981' : '#d97706', whiteSpace: 'nowrap' }}>
                    {fmtMoney(p.amount)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: p.status === 'pagado' ? '#f0fdf4' : '#fef9ec', color: p.status === 'pagado' ? '#10b981' : '#d97706' }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: pType === 'Final' ? '#f0fdf4' : pType === 'Anticipo' ? '#eff6ff' : '#f8fafc', color: pType === 'Final' ? '#10b981' : pType === 'Anticipo' ? '#2552ca' : '#64748b', border: `0.5px solid ${pType === 'Final' ? '#bbf7d0' : pType === 'Anticipo' ? '#bfdbfe' : '#e2e8f0'}` }}>
                      {pType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {p.comprobante_url ? (
                      <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>Ver ↗</a>
                    ) : <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.fecha)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={{ fontSize: 11, color: '#2552ca', background: '#eff6ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                        Editar
                      </button>
                      <button onClick={() => deletePay(p.id)} style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No hay pagos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}