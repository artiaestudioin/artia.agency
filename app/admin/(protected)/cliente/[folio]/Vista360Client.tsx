'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Lead = {
  id: string; folio: string | null; nombre: string; email: string | null; telefono: string | null
  servicio: string | null; mensaje: string | null; estado: string | null
  notes: string | null; estimated_value: number | null; final_value: number | null
  payment_status: string | null; created_at: string
}

type Payment = { id: string; amount: number; status: string; method: string; description: string | null; fecha: string }
type Project = { id: string; name: string; access_code: string; status: string; event_date: string | null; created_at: string } | null
type ProjectFile = { id: string; file_url: string; file_name: string | null; file_type: string | null }

const ESTADOS = ['nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido'] as const
const ESTADO_CFG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:      { label: 'Nuevo',      color: '#3b82f6', bg: '#eff6ff' },
  contactado: { label: 'Contactado', color: '#f59e0b', bg: '#fefce8' },
  en_proceso: { label: 'En proceso', color: '#8b5cf6', bg: '#f5f3ff' },
  cerrado:    { label: 'Cerrado ✓',  color: '#10b981', bg: '#f0fdf4' },
  perdido:    { label: 'Perdido',    color: '#ef4444', bg: '#fef2f2' },
}

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia', efectivo: 'Efectivo', tarjeta: 'Tarjeta', cheque: 'Cheque', otro: 'Otro',
}

function fmtMoney(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const p = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6']
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length
  return p[h]
}

export default function Vista360Client({ lead: initLead, payments: initPayments, project, projectFiles }: {
  lead: Lead; payments: Payment[]; project: Project; projectFiles: ProjectFile[]
}) {
  const router = useRouter()
  const [lead, setLead]           = useState(initLead)
  const [payments, setPayments]   = useState(initPayments)
  const [notes, setNotes]         = useState(initLead.notes ?? '')
  const [editNotes, setEditNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingEstado, setSavingEstado] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payForm, setPayForm]     = useState({ amount: '', method: 'transferencia', description: '', fecha: new Date().toISOString().slice(0, 10), status: 'pagado' })
  const [savingPay, setSavingPay] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveNotes() {
    setSavingNotes(true)
    try {
      const res = await fetch('/api/admin/lead-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, notes }),
      })
      if (res.ok) { setLead(l => ({ ...l, notes })); setEditNotes(false); showToast('Notas guardadas', true) }
      else showToast('Error guardando', false)
    } finally { setSavingNotes(false) }
  }

  async function changeEstado(newEstado: string) {
    setSavingEstado(true)
    try {
      const res = await fetch('/api/admin/lead-estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, estado: newEstado }),
      })
      if (res.ok) {
        setLead(l => ({ ...l, estado: newEstado }))
        showToast('Estado actualizado', true)
        // Si se cierra, disparar lógica de proyecto
        if (newEstado === 'cerrado') {
          await fetch('/api/admin/pipeline-cerrado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: lead.id }),
          })
        }
        router.refresh()
      }
    } finally { setSavingEstado(false) }
  }

  async function savePay(e: React.FormEvent) {
    e.preventDefault()
    if (!payForm.amount) return
    setSavingPay(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payForm, lead_id: lead.id, amount: parseFloat(payForm.amount) }),
      })
      const data = await res.json()
      if (res.ok && data.payment) {
        setPayments(prev => [data.payment, ...prev])
        setShowPayForm(false)
        setPayForm({ amount: '', method: 'transferencia', description: '', fecha: new Date().toISOString().slice(0, 10), status: 'pagado' })
        showToast('Pago registrado', true)
        router.refresh()
      } else showToast(data.error ?? 'Error', false)
    } finally { setSavingPay(false) }
  }

  async function createProjectForLead() {
    setCreatingProject(true)
    try {
      const res = await fetch('/api/admin/pipeline-cerrado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (res.ok) { showToast('Proyecto creado y correo enviado ✓', true); router.refresh() }
      else showToast(data.error ?? 'Error', false)
    } finally { setCreatingProject(false) }
  }

  const totalPagado    = payments.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const totalPendiente = payments.filter(p => p.status === 'pendiente').reduce((s, p) => s + p.amount, 0)
  const estadoCfg      = ESTADO_CFG[lead.estado ?? 'nuevo']

  const sLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`, color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: avatarBg(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {initials(lead.nombre)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#00113a', margin: 0 }}>{lead.nombre}</h1>
              <span style={{ fontSize: 10, fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.5px' }}>
                {estadoCfg.label.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
              {lead.folio && <span style={{ fontFamily: 'monospace', fontSize: 11, marginRight: 10, color: '#94a3b8' }}>{lead.folio}</span>}
              {lead.email && <a href={`mailto:${lead.email}`} style={{ color: '#2552ca', textDecoration: 'none' }}>{lead.email}</a>}
              {lead.telefono && <span style={{ marginLeft: 10 }}>{lead.telefono}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href="/admin/leads" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none', padding: '8px 14px', background: '#f1f5f9', borderRadius: 8, fontWeight: 600 }}>← Volver</Link>
          {project && (
            <a href={`/client/${project.access_code}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', padding: '8px 14px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 8, fontWeight: 700 }}>
              Portal cliente ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Grid principal 2 cols ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info del servicio */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 14 }}>📋 Información del lead</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <span style={sLabel}>Servicio</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{lead.servicio ?? '—'}</span>
              </div>
              <div>
                <span style={sLabel}>Fecha ingreso</span>
                <span style={{ fontSize: 13, color: '#0f172a' }}>{fmtDate(lead.created_at)}</span>
              </div>
              <div>
                <span style={sLabel}>Valor estimado</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>{fmtMoney(lead.estimated_value)}</span>
              </div>
              <div>
                <span style={sLabel}>Valor final</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#00113a' }}>{fmtMoney(lead.final_value)}</span>
              </div>
            </div>
            {lead.mensaje && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid #e2e8f0' }}>
                <span style={sLabel}>Mensaje del cliente</span>
                <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>{lead.mensaje}</p>
              </div>
            )}
          </div>

          {/* Cambiar estado */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 14 }}>⚙️ Estado del pipeline</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ESTADOS.map(e => {
                const cfg     = ESTADO_CFG[e]
                const isActive = lead.estado === e
                return (
                  <button key={e} disabled={savingEstado || isActive} onClick={() => changeEstado(e)} style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: isActive ? 'default' : 'pointer',
                    background: isActive ? cfg.color : cfg.bg,
                    color: isActive ? '#fff' : cfg.color,
                    border: `1.5px solid ${isActive ? cfg.color : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notas internas */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>📝 Notas internas</div>
              <button onClick={() => editNotes ? saveNotes() : setEditNotes(true)} disabled={savingNotes} style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: editNotes ? '#00113a' : '#f1f5f9', color: editNotes ? '#fff' : '#475569',
              }}>
                {savingNotes ? 'Guardando…' : editNotes ? 'Guardar' : 'Editar'}
              </button>
            </div>
            {editNotes ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} placeholder="Notas internas, acuerdos, detalles del cliente…" />
            ) : (
              <p style={{ fontSize: 13, color: notes ? '#475569' : '#94a3b8', margin: 0, lineHeight: 1.7, fontStyle: notes ? 'normal' : 'italic' }}>
                {notes || 'Sin notas. Haz clic en Editar para agregar.'}
              </p>
            )}
          </div>

          {/* Historial de pagos */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>💰 Pagos</div>
              <button onClick={() => setShowPayForm(!showPayForm)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569' }}>
                + Registrar pago
              </button>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Pagado</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{fmtMoney(totalPagado)}</div>
              </div>
              {totalPendiente > 0 && (
                <div style={{ flex: 1, background: '#fef9ec', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Pendiente</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#d97706' }}>{fmtMoney(totalPendiente)}</div>
                </div>
              )}
            </div>

            {/* Formulario pago */}
            {showPayForm && (
              <form onSubmit={savePay} style={{ background: '#f8fafc', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={sLabel}>Monto *</label>
                    <input type="number" step="0.01" min="0" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={sLabel}>Estado</label>
                    <select value={payForm.status} onChange={e => setPayForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                      <option value="pagado">Pagado</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                  <div>
                    <label style={sLabel}>Método</label>
                    <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))} style={inputStyle}>
                      {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={sLabel}>Fecha</label>
                    <input type="date" value={payForm.fecha} onChange={e => setPayForm(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <input type="text" value={payForm.description} onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción (ej: Anticipo 50%)" style={{ ...inputStyle, marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={savingPay} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {savingPay ? 'Guardando…' : 'Registrar'}
                  </button>
                  <button type="button" onClick={() => setShowPayForm(false)} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Lista pagos */}
            {payments.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Sin pagos registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: p.status === 'pagado' ? '#f0fdf4' : '#fef9ec', borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'pagado' ? '#10b981' : '#d97706', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: p.status === 'pagado' ? '#10b981' : '#d97706' }}>{fmtMoney(p.amount)}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{METHOD_LABELS[p.method] ?? p.method}</span>
                      </div>
                      {p.description && <div style={{ fontSize: 11, color: '#64748b' }}>{p.description}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{fmtDate(p.fecha)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Proyecto vinculado */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 14 }}>📁 Proyecto</div>
            {project ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{project.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                  <code style={{ fontSize: 11, fontFamily: 'monospace', background: '#f1f5f9', color: '#2552ca', fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '2px' }}>
                    {project.access_code}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(project.access_code) }} style={{ fontSize: 10, background: 'none', border: '0.5px solid #e2e8f0', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', color: '#64748b' }}>
                    Copiar
                  </button>
                </div>
                {project.event_date && (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>📅 {fmtDate(project.event_date)}</div>
                )}
                {/* Mini galería */}
                {projectFiles.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 10 }}>
                    {projectFiles.slice(0, 6).map(f => (
                      f.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.file_url) ? (
                        <img key={f.id} src={f.file_url} alt={f.file_name ?? ''} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                      ) : (
                        <div key={f.id} style={{ width: '100%', aspectRatio: '1', background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📄</div>
                      )
                    ))}
                  </div>
                )}
                <a href={`/admin/proyectos`} style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 700 }}>
                  Gestionar archivos →
                </a>
              </>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px' }}>No hay proyecto vinculado a este lead.</p>
                <button onClick={createProjectForLead} disabled={creatingProject} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                  {creatingProject ? 'Creando…' : '+ Crear proyecto y enviar acceso'}
                </button>
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 14 }}>⚡ Acciones rápidas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lead.email && (
                <a href={`mailto:${lead.email}`} style={{ display: 'block', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                  ✉️ Enviar email
                </a>
              )}
              {lead.telefono && (
                <a href={`https://wa.me/${lead.telefono?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#10b981', textDecoration: 'none', border: '0.5px solid #bbf7d0' }}>
                  💬 WhatsApp
                </a>
              )}
              <Link href="/admin/emails" style={{ display: 'block', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                📨 Usar plantilla de email
              </Link>
              <Link href="/admin/pipeline" style={{ display: 'block', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                🗂️ Ver en pipeline
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
