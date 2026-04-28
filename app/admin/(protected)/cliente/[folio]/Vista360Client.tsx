'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────

type Lead = {
  id: string; folio: string | null; nombre: string; email: string | null; telefono: string | null
  servicio: string | null; mensaje: string | null; estado: string | null
  notes: string | null; estimated_value: number | null; final_value: number | null
  contract_value?: number | null; payment_status: string | null; created_at: string
}
type Payment = {
  id: string; amount: number; status: string; method: string
  description: string | null; fecha: string; comprobante_url?: string | null
  payment_month?: string | null; due_date?: string | null; payment_number?: number | null
}
type Project = { id: string; name: string; access_code: string; status: string; event_date: string | null; created_at: string } | null
type ProjectFile = { id: string; file_url: string; file_name: string | null; file_type: string | null }

// ─── Constants ─────────────────────────────────────────────────────

const ESTADOS = ['nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido'] as const
const ESTADO_CFG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:      { label: 'Nuevo',      color: '#3b82f6', bg: '#eff6ff' },
  contactado: { label: 'Contactado', color: '#f59e0b', bg: '#fefce8' },
  en_proceso: { label: 'En proceso', color: '#8b5cf6', bg: '#f5f3ff' },
  cerrado:    { label: 'Cerrado ✓',  color: '#10b981', bg: '#f0fdf4' },
  perdido:    { label: 'Perdido',    color: '#ef4444', bg: '#fef2f2' },
}

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  otro: 'Otro',
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

// ─── Helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {
  // parse sin desfase de timezone
  const clean = d.split('T')[0]
  const [y, m, day] = clean.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const p = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length
  return p[h]
}

// ─── Component ─────────────────────────────────────────────────────

export default function Vista360Client({
  lead: initLead, payments: initPayments, project, projectFiles,
}: {
  lead: Lead; payments: Payment[]; project: Project; projectFiles: ProjectFile[]
}) {
  const router = useRouter()
  const [lead, setLead]           = useState(initLead)
  const [payments, setPayments]   = useState(initPayments)
  const [notes, setNotes]         = useState(initLead.notes ?? '')
  const [editNotes, setEditNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [editPay, setEditPay]     = useState<Payment | null>(null)
  const [savingPay, setSavingPay] = useState(false)
  const [uploadingComp, setUploadingComp] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const compInputRef = useRef<HTMLInputElement>(null)

  // FIX HIDRATACIÓN: valor de fecha calculado solo en cliente
  const [mounted, setMounted] = useState(false)
  const [mesActual, setMesActual] = useState('')
  const [anioActual, setAnioActual] = useState(0)
  const [fechaHoy, setFechaHoy] = useState('')

  useEffect(() => {
    const d = new Date()
    const mes = MESES[d.getMonth()] + ' ' + d.getFullYear()
    setMesActual(mes)
    setAnioActual(d.getFullYear())
    setFechaHoy(d.toISOString().slice(0, 10))
    setMounted(true)
  }, [])

  // payForm nunca usa new Date() directamente en el initializer (evita mismatch)
  const emptyPayForm = {
    amount: '', method: 'transferencia', description: '',
    fecha: '', status: 'pagado',
    comprobante_url: '', payment_month: '',
    due_date: '', payment_number: '',
  }
  const [payForm, setPayForm] = useState(emptyPayForm)

  // Una vez montado, rellenar los campos que dependen de la fecha
  useEffect(() => {
    if (!mounted) return
    setPayForm(p => ({
      ...p,
      fecha: p.fecha || fechaHoy,
      payment_month: p.payment_month || mesActual,
    }))
  }, [mounted, fechaHoy, mesActual])

  // Email directo
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailForm, setEmailForm] = useState({ asunto: `Hola ${initLead.nombre} — Artia Studio`, cuerpo: '' })
  const [sendingEmail, setSendingEmail] = useState(false)

  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function saveNotes() {
    setSavingNotes(true)
    try {
      const res = await fetch('/api/admin/lead-notes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, notes }),
      })
      if (res.ok) { setLead(l => ({ ...l, notes })); setEditNotes(false); showMsg('Notas guardadas') }
      else showMsg('Error guardando', false)
    } finally { setSavingNotes(false) }
  }

  async function changeEstado(newEstado: string) {
    const res = await fetch('/api/admin/lead-estado', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, estado: newEstado }),
    })
    if (res.ok) { setLead(l => ({ ...l, estado: newEstado })); showMsg('Estado actualizado') }
    else showMsg('Error actualizando estado', false)
  }

  async function uploadComprobante(file: File) {
    setUploadingComp(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) { setPayForm(p => ({ ...p, comprobante_url: data.url })); showMsg('Comprobante adjuntado ✓') }
      else showMsg('Error subiendo comprobante', false)
    } finally { setUploadingComp(false) }
  }

  function openEditPay(p: Payment) {
    setEditPay(p)
    setPayForm({
      amount: String(p.amount), method: p.method, description: p.description ?? '',
      fecha: p.fecha.slice(0, 10), status: p.status,
      comprobante_url: p.comprobante_url ?? '', payment_month: p.payment_month ?? mesActual,
      due_date: p.due_date?.slice(0, 10) ?? '', payment_number: String(p.payment_number ?? ''),
    })
    setShowPayForm(true)
  }

  function openNewPay() {
    setEditPay(null)
    setPayForm({ ...emptyPayForm, fecha: fechaHoy, payment_month: mesActual })
    setShowPayForm(true)
  }

  async function savePay(e: React.FormEvent) {
    e.preventDefault()
    if (!payForm.amount) return
    setSavingPay(true)
    try {
      const body = {
        ...payForm,
        lead_id: lead.id,
        amount: parseFloat(payForm.amount),
        payment_number: payForm.payment_number ? parseInt(payForm.payment_number) : null,
        due_date: payForm.due_date || null,
        comprobante_url: payForm.comprobante_url || null,
      }
      if (editPay) {
        const res  = await fetch(`/api/admin/payments/${editPay.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        if (res.ok) {
          setPayments(prev => prev.map(p => p.id === editPay.id ? { ...p, ...body, amount: parseFloat(payForm.amount) } : p))
          showMsg('Pago actualizado ✓')
        } else showMsg(data.error ?? 'Error', false)
      } else {
        const res  = await fetch('/api/admin/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        if (res.ok && data.payment) {
          setPayments(prev => [data.payment, ...prev])
          showMsg('Pago registrado ✓')
          router.refresh()
        } else showMsg(data.error ?? 'Error', false)
      }
      setShowPayForm(false); setEditPay(null); setPayForm({ ...emptyPayForm, fecha: fechaHoy, payment_month: mesActual })
    } finally { setSavingPay(false) }
  }

  async function deletePay(id: string) {
    if (!confirm('¿Eliminar este pago?')) return
    const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' })
    if (res.ok) { setPayments(prev => prev.filter(p => p.id !== id)); showMsg('Pago eliminado') }
    else showMsg('Error eliminando', false)
  }

  async function createProjectForLead() {
    setCreatingProject(true)
    try {
      const res  = await fetch('/api/admin/pipeline-cerrado', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (res.ok) { showMsg('Proyecto creado y acceso enviado por email ✓'); router.refresh() }
      else showMsg(data.error ?? 'Error', false)
    } finally { setCreatingProject(false) }
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!lead.email || !emailForm.asunto || !emailForm.cuerpo) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/admin/send-quick-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.email, asunto: emailForm.asunto, cuerpo: emailForm.cuerpo, nombre: lead.nombre, folio: lead.folio }),
      })
      const data = await res.json()
      if (res.ok) { showMsg(`Email enviado a ${lead.email} ✓`); setShowEmailForm(false) }
      else showMsg(data.error ?? 'Error enviando email', false)
    } finally { setSendingEmail(false) }
  }

  const totalPagado    = payments.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const totalPendiente = payments.filter(p => p.status !== 'pagado').reduce((s, p) => s + p.amount, 0)
  const estadoCfg      = ESTADO_CFG[lead.estado ?? 'nuevo'] ?? ESTADO_CFG.nuevo

  const sLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
    color: '#94a3b8', display: 'block', marginBottom: 6,
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
  }
  const card: React.CSSProperties = {
    background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '18px 20px',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxWidth: 'calc(100vw - 40px)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 14, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 13, background: avatarBg(lead.nombre),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 900, color: '#fff', flexShrink: 0,
          }}>
            {initials(lead.nombre)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#00113a', margin: 0, wordBreak: 'break-word' }}>{lead.nombre}</h1>
              <span style={{
                fontSize: 10, fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color,
                padding: '3px 10px', borderRadius: 20, letterSpacing: '0.5px', whiteSpace: 'nowrap',
              }}>
                {estadoCfg.label.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lead.folio && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{lead.folio}</span>}
              {lead.email && <span style={{ color: '#2552ca', wordBreak: 'break-all' }}>{lead.email}</span>}
              {lead.telefono && <span>{lead.telefono}</span>}
            </div>
          </div>
        </div>
        <Link href="/admin/leads" style={{
          fontSize: 12, color: '#64748b', textDecoration: 'none',
          padding: '8px 14px', background: '#f1f5f9', borderRadius: 8, fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          ← Volver
        </Link>
      </div>

      {/* Main grid — responsive */}
      <div className="vista360-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 18, alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Info */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 12 }}>📋 Información</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div><span style={sLabel}>Servicio</span><span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{lead.servicio ?? '—'}</span></div>
              <div><span style={sLabel}>Fecha ingreso</span><span style={{ fontSize: 13, color: '#0f172a' }}>{fmtDate(lead.created_at)}</span></div>
              <div><span style={sLabel}>Valor estimado</span><span style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>{fmtMoney(lead.estimated_value)}</span></div>
              <div><span style={sLabel}>Valor final</span><span style={{ fontSize: 15, fontWeight: 800, color: '#00113a' }}>{fmtMoney(lead.final_value)}</span></div>
            </div>
            {lead.mensaje && (
              <div style={{ marginTop: 12, padding: '11px 13px', background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid #e2e8f0' }}>
                <span style={sLabel}>Mensaje del cliente</span>
                <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>{lead.mensaje}</p>
              </div>
            )}
          </div>

          {/* Estado */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 12 }}>⚙️ Estado del pipeline</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {ESTADOS.map(e => {
                const cfg = ESTADO_CFG[e]; const isActive = lead.estado === e
                return (
                  <button key={e} onClick={() => !isActive && changeEstado(e)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: isActive ? 'default' : 'pointer',
                    background: isActive ? cfg.color : cfg.bg, color: isActive ? '#fff' : cfg.color,
                    border: `1.5px solid ${isActive ? cfg.color : 'transparent'}`, transition: 'all 0.15s',
                  }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notas */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>📝 Notas internas</div>
              <button onClick={() => editNotes ? saveNotes() : setEditNotes(true)} disabled={savingNotes} style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: editNotes ? '#00113a' : '#f1f5f9', color: editNotes ? '#fff' : '#475569',
              }}>
                {savingNotes ? 'Guardando…' : editNotes ? 'Guardar' : 'Editar'}
              </button>
            </div>
            {editNotes ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} placeholder="Notas internas…" />
            ) : (
              <p style={{ fontSize: 13, color: notes ? '#475569' : '#94a3b8', margin: 0, lineHeight: 1.7, fontStyle: notes ? 'normal' : 'italic' }}>
                {notes || 'Sin notas. Haz clic en Editar para agregar.'}
              </p>
            )}
          </div>

          {/* ── Pagos ──────────────────────────────────────────────── */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>💰 Pagos</div>
              <button onClick={openNewPay} style={{
                fontSize: 11, fontWeight: 700, padding: '6px 14px',
                borderRadius: 6, border: 'none', cursor: 'pointer', background: '#00113a', color: '#fff',
              }}>
                + Registrar pago
              </button>
            </div>

            {/* Resumen financiero */}
            {(lead.estimated_value || lead.final_value) && (() => {
              const contractVal = lead.final_value ?? lead.estimated_value ?? 0
              const pct = contractVal > 0 ? Math.min((totalPagado / contractVal) * 100, 100) : 0
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 120px', background: '#f0fdf4', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 3 }}>Cobrado</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#10b981' }}>{fmtMoney(totalPagado)}</div>
                    </div>
                    {totalPendiente > 0 && (
                      <div style={{ flex: '1 1 120px', background: '#fef9ec', borderRadius: 8, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 3 }}>Pendiente</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#d97706' }}>{fmtMoney(totalPendiente)}</div>
                      </div>
                    )}
                    <div style={{ flex: '1 1 120px', background: '#f8fafc', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 3 }}>Acordado</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{fmtMoney(contractVal)}</div>
                    </div>
                  </div>
                  {contractVal > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                        <span>Progreso del contrato</span><span>{Math.round(pct)}%</span>
                      </div>
                      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#2552ca', borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Formulario de pago (nuevo / editar) ─────────────── */}
            {showPayForm && (
              <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 11, padding: '18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>
                    {editPay ? '✏️ Editar pago' : '➕ Nuevo pago'}
                  </span>
                  <button
                    onClick={() => { setShowPayForm(false); setEditPay(null); setPayForm({ ...emptyPayForm, fecha: fechaHoy, payment_month: mesActual }) }}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
                  >×</button>
                </div>
                <form onSubmit={savePay}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11, marginBottom: 11 }}>
                    {/* Monto */}
                    <div>
                      <label style={sLabel}>Monto (USD) *</label>
                      <input type="number" step="0.01" min="0" value={payForm.amount}
                        onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                        style={inp} required placeholder="0.00" />
                    </div>
                    {/* Estado */}
                    <div>
                      <label style={sLabel}>Estado</label>
                      <select value={payForm.status} onChange={e => setPayForm(p => ({ ...p, status: e.target.value }))} style={inp}>
                        <option value="pagado">✓ Pagado</option>
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="vencido">❌ Vencido</option>
                      </select>
                    </div>
                    {/* Tipo de Pago — SINCRONIZADO con FinanzasClient */}
                    <div>
                      <label style={sLabel}>Tipo de Pago</label>
                      <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))} style={inp}>
                        {Object.entries(METHOD_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    {/* Fecha de pago */}
                    <div>
                      <label style={sLabel}>Fecha de pago</label>
                      <input type="date" value={payForm.fecha}
                        onChange={e => setPayForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
                    </div>
                    {/* Nº cuota */}
                    <div>
                      <label style={sLabel}>Nº de cuota / pago</label>
                      <input type="number" min="1" value={payForm.payment_number}
                        onChange={e => setPayForm(p => ({ ...p, payment_number: e.target.value }))}
                        style={inp} placeholder="1=Anticipo, 2, 3…" />
                    </div>
                    {/* Fecha límite */}
                    <div>
                      <label style={sLabel}>Fecha límite</label>
                      <input type="date" value={payForm.due_date}
                        onChange={e => setPayForm(p => ({ ...p, due_date: e.target.value }))} style={inp} />
                    </div>
                  </div>

                  {/* Mes del pago */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={sLabel}>Mes del pago</label>
                    <input type="text" value={payForm.payment_month}
                      onChange={e => setPayForm(p => ({ ...p, payment_month: e.target.value }))}
                      style={inp} placeholder={mesActual} />
                    {mounted && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
                        {MESES.map(m => (
                          <button key={m} type="button"
                            onClick={() => setPayForm(p => ({ ...p, payment_month: `${m} ${anioActual}` }))}
                            style={{
                              fontSize: 9, padding: '2px 7px', borderRadius: 7,
                              border: '0.5px solid #e2e8f0',
                              background: payForm.payment_month?.startsWith(m) ? '#00113a' : '#fff',
                              color: payForm.payment_month?.startsWith(m) ? '#fff' : '#64748b',
                              cursor: 'pointer', fontWeight: 700,
                            }}>
                            {m.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={sLabel}>Descripción / Notas del pago</label>
                    <input type="text" value={payForm.description}
                      onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="ej: Anticipo 50% · $275 de $550" style={inp} />
                  </div>

                  {/* Comprobante */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={sLabel}>Comprobante</label>
                    {payForm.comprobante_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a href={payForm.comprobante_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>
                          Ver comprobante ↗
                        </a>
                        <button type="button" onClick={() => setPayForm(p => ({ ...p, comprobante_url: '' }))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
                          × Quitar
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => compInputRef.current?.click()} style={{
                        border: '1.5px dashed #e2e8f0', borderRadius: 8, padding: '9px',
                        textAlign: 'center', cursor: 'pointer', background: '#fff', fontSize: 12, color: '#64748b',
                      }}>
                        {uploadingComp ? 'Subiendo…' : '📎 Adjuntar comprobante'}
                      </div>
                    )}
                    <input ref={compInputRef} type="file" accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadComprobante(f) }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={savingPay} style={{
                      background: '#00113a', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {savingPay ? 'Guardando…' : editPay ? 'Actualizar pago' : 'Registrar pago'}
                    </button>
                    <button type="button"
                      onClick={() => { setShowPayForm(false); setEditPay(null); setPayForm({ ...emptyPayForm, fecha: fechaHoy, payment_month: mesActual }) }}
                      style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de pagos */}
            {payments.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Sin pagos registrados aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {payments
                  .slice()
                  .sort((a, b) => (a.payment_number ?? 99) - (b.payment_number ?? 99))
                  .map(p => {
                    const vencido = p.due_date && new Date(p.due_date.split('T')[0]) < new Date(new Date().toDateString()) && p.status !== 'pagado'
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 13px',
                        background: p.status === 'pagado' ? '#f0fdf4' : '#fef9ec',
                        borderRadius: 9,
                        border: `0.5px solid ${p.status === 'pagado' ? '#bbf7d0' : '#fde68a'}`,
                        flexWrap: 'wrap',
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.status === 'pagado' ? '#10b981' : '#d97706', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            {p.payment_number && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>#{p.payment_number}</span>
                            )}
                            <span style={{ fontSize: 14, fontWeight: 900, color: p.status === 'pagado' ? '#10b981' : '#d97706' }}>
                              {fmtMoney(p.amount)}
                            </span>
                            {p.payment_month && (
                              <span style={{ fontSize: 10, color: '#64748b', background: '#fff', padding: '2px 6px', borderRadius: 7, border: '0.5px solid #e2e8f0' }}>
                                {p.payment_month}
                              </span>
                            )}
                            {/* Tipo de pago visible en la lista */}
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                              {METHOD_LABELS[p.method] ?? p.method}
                            </span>
                          </div>
                          {p.description && (
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{p.description}</div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 10, color: '#94a3b8', flexWrap: 'wrap' }}>
                            <span>Pagó: {fmtDate(p.fecha)}</span>
                            {p.due_date && (
                              <span style={{ color: vencido ? '#ef4444' : '#94a3b8', fontWeight: vencido ? 700 : 400 }}>
                                Límite: {fmtDate(p.due_date)}{vencido ? ' ⚠️' : ''}
                              </span>
                            )}
                            {p.comprobante_url && (
                              <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>
                                Ver comprobante ↗
                              </a>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          <button onClick={() => openEditPay(p)} style={{
                            fontSize: 11, color: '#2552ca', background: '#eff6ff',
                            border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700,
                          }}>Editar</button>
                          <button onClick={() => deletePay(p.id)} style={{
                            fontSize: 11, color: '#ef4444', background: '#fef2f2',
                            border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontWeight: 700,
                          }}>×</button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Email directo */}
          {lead.email && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>✉️ Enviar email directo</div>
                <button onClick={() => setShowEmailForm(!showEmailForm)} style={{
                  fontSize: 11, fontWeight: 700, padding: '5px 12px',
                  borderRadius: 6, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569',
                }}>
                  {showEmailForm ? 'Cancelar' : 'Redactar'}
                </button>
              </div>
              {showEmailForm ? (
                <form onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div>
                    <label style={sLabel}>Para</label>
                    <input value={lead.email} readOnly style={{ ...inp, background: '#f8fafc', color: '#64748b' }} />
                  </div>
                  <div>
                    <label style={sLabel}>Asunto</label>
                    <input value={emailForm.asunto} onChange={e => setEmailForm(p => ({ ...p, asunto: e.target.value }))} style={inp} required />
                  </div>
                  <div>
                    <label style={sLabel}>Mensaje</label>
                    <textarea value={emailForm.cuerpo} onChange={e => setEmailForm(p => ({ ...p, cuerpo: e.target.value }))}
                      rows={5} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                      required placeholder={`Hola ${lead.nombre},\n\n`} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={sendingEmail} style={{
                      background: '#00113a', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {sendingEmail ? 'Enviando…' : 'Enviar email →'}
                    </button>
                    <Link href="/admin/emails" style={{
                      display: 'flex', alignItems: 'center',
                      background: '#f1f5f9', color: '#475569', border: 'none',
                      borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                    }}>
                      Usar plantilla
                    </Link>
                  </div>
                </form>
              ) : (
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Envía un email directo a <strong>{lead.email}</strong> sin salir del sistema.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Columna derecha ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Proyecto */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 12 }}>📁 Proyecto</div>
            {project ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{project.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 9 }}>
                  <code style={{ fontSize: 11, fontFamily: 'monospace', background: '#f1f5f9', color: '#2552ca', fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '2px' }}>
                    {project.access_code}
                  </code>
                  <button onClick={() => navigator.clipboard.writeText(project!.access_code).then(() => showMsg('Código copiado'))}
                    style={{ fontSize: 10, background: 'none', border: '0.5px solid #e2e8f0', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', color: '#64748b' }}>
                    Copiar
                  </button>
                </div>
                {projectFiles.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 9 }}>
                    {projectFiles.slice(0, 6).map(f => (
                      f.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.file_url) ? (
                        <img key={f.id} src={f.file_url} alt={f.file_name ?? ''} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                      ) : (
                        <div key={f.id} style={{ width: '100%', aspectRatio: '1', background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄</div>
                      )
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <a href={`/client/${project.access_code}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#2552ca', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 6, padding: '5px 11px', textDecoration: 'none', fontWeight: 700 }}>
                    Portal cliente ↗
                  </a>
                  <Link href="/admin/proyectos" style={{ fontSize: 11, color: '#475569', background: '#f1f5f9', borderRadius: 6, padding: '5px 11px', textDecoration: 'none', fontWeight: 700 }}>
                    Gestionar
                  </Link>
                </div>
              </>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 10px' }}>Sin proyecto vinculado.</p>
                <button onClick={createProjectForLead} disabled={creatingProject} style={{
                  background: '#00113a', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%',
                }}>
                  {creatingProject ? 'Creando…' : '+ Crear proyecto y enviar acceso'}
                </button>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 12 }}>⚡ Acciones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {lead.telefono && (
                <a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: '10px 13px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#10b981', textDecoration: 'none', border: '0.5px solid #bbf7d0' }}>
                  💬 WhatsApp
                </a>
              )}
              <Link href="/admin/pipeline" style={{ display: 'block', padding: '10px 13px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                🗂️ Ver en pipeline
              </Link>
              <Link href="/admin/emails" style={{ display: 'block', padding: '10px 13px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                📨 Plantillas de email
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 820px) {
          .vista360-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
