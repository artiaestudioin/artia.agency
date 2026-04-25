'use client'

import { useState, useMemo } from 'react'

type Payment = {
  id: string
  lead_id: string
  amount: number
  status: 'pagado' | 'pendiente' | 'cancelado'
  method: string
  description: string | null
  fecha: string
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
  email: string | null
  payment_status: string | null
  estimated_value: number | null
  final_value: number | null
  estado: string | null
}

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  otro: 'Otro',
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function FinanzasClient({ payments: initPayments, leads }: { payments: Payment[]; leads: Lead[] }) {
  const [payments, setPayments] = useState<Payment[]>(initPayments)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const [form, setForm] = useState({
    lead_id: '', amount: '', method: 'transferencia', description: '', fecha: new Date().toISOString().slice(0, 10), status: 'pagado',
  })

  // ── Métricas ────────────────────────────────────────────────
  const { ingresoTotal, ingresoMes, pendienteTotal, porMes } = useMemo(() => {
    const now        = new Date()
    const mesActual  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const paid       = payments.filter(p => p.status === 'pagado')
    const ingresoTotal  = paid.reduce((s, p) => s + p.amount, 0)
    const ingresoMes    = paid.filter(p => p.fecha.startsWith(mesActual)).reduce((s, p) => s + p.amount, 0)
    const pendienteTotal= payments.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.amount, 0)

    // Flujo por mes (últimos 6 meses)
    const meses: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      meses[key] = 0
    }
    paid.forEach(p => {
      const key = p.fecha.slice(0, 7)
      if (key in meses) meses[key] += p.amount
    })

    return { ingresoTotal, ingresoMes, pendienteTotal, porMes: Object.entries(meses) }
  }, [payments])

  const maxMes = Math.max(...porMes.map(([, v]) => v), 1)

  // ── Filtrado ────────────────────────────────────────────────
  const filteredPayments = filterStatus === 'todos'
    ? payments
    : payments.filter(p => p.status === filterStatus)

  // ── Registrar pago ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lead_id || !form.amount) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      const data = await res.json()
      if (res.ok && data.payment) {
        const lead = leads.find(l => l.id === form.lead_id)
        setPayments(prev => [{ ...data.payment, lead: lead ? { nombre: lead.nombre, folio: lead.folio, servicio: lead.servicio } : null }, ...prev])
        setShowForm(false)
        setForm({ lead_id: '', amount: '', method: 'transferencia', description: '', fecha: new Date().toISOString().slice(0, 10), status: 'pagado' })
      }
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
    textTransform: 'uppercase', color: '#94a3b8', marginBottom: 5,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#00113a', margin: 0 }}>Finanzas</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Control de ingresos y pagos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px' }}>
          + Registrar pago
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#00113a', borderRadius: 14, padding: '22px 24px', color: '#fff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Ingresos totales</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px' }}>{fmtMoney(ingresoTotal)}</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>Este mes</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', letterSpacing: '-1px' }}>{fmtMoney(ingresoMes)}</div>
        </div>
        <div style={{ background: pendienteTotal > 0 ? '#fef9ec' : '#fff', border: `0.5px solid ${pendienteTotal > 0 ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>Pendiente de cobro</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: pendienteTotal > 0 ? '#d97706' : '#10b981', letterSpacing: '-1px' }}>{fmtMoney(pendienteTotal)}</div>
        </div>
      </div>

      {/* Gráfico flujo mensual */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#00113a', marginBottom: 20 }}>Flujo mensual</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
          {porMes.map(([mes, val]) => {
            const pct  = (val / maxMes) * 100
            const label = new Date(mes + '-01').toLocaleDateString('es-EC', { month: 'short' })
            return (
              <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>{val > 0 ? fmtMoney(val).replace('US$', '') : ''}</div>
                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px 4px 0 0', position: 'relative', flex: 1, maxHeight: 72 }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: val > 0 ? '#2552ca' : '#e2e8f0', borderRadius: '4px 4px 0 0', height: `${Math.max(pct, 2)}%`, transition: 'height 0.4s' }} />
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Formulario registro de pago */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#00113a', margin: '0 0 20px' }}>Registrar pago</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Lead / Cliente *</label>
                <select value={form.lead_id} onChange={e => setForm(p => ({ ...p, lead_id: e.target.value }))} style={inputStyle} required>
                  <option value="">Seleccionar cliente…</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.nombre}{l.folio ? ` (${l.folio})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Monto (USD) *</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Método de pago</label>
                <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} style={inputStyle}>
                  {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descripción</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="ej: Anticipo 50%" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Guardando…' : 'Registrar pago'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de pagos */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#00113a' }}>Historial de pagos</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos', 'pagado', 'pendiente'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: '0.5px solid #e2e8f0', cursor: 'pointer',
                background: filterStatus === s ? '#00113a' : '#fff',
                color: filterStatus === s ? '#fff' : '#64748b',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Cliente', 'Monto', 'Estado', 'Método', 'Descripción', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '0.5px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p.id} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.lead?.nombre ?? '—'}</div>
                    {p.lead?.folio && <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{p.lead.folio}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 800, color: p.status === 'pagado' ? '#10b981' : '#d97706' }}>
                    {fmtMoney(p.amount)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: p.status === 'pagado' ? '#f0fdf4' : '#fef9ec', color: p.status === 'pagado' ? '#10b981' : '#d97706' }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.fecha)}</td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
