'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import NuevoLeadModal from './NuevoLeadModal'

type Lead = {
  id: string
  folio: string | null
  nombre: string
  email: string | null
  telefono: string | null
  servicio: string | null
  estado: string | null
  payment_status: string | null
  estimated_value: number | null
  created_at: string
  notes: string | null
}

// ─── Constants ────────────────────────────────────────────────────

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  nuevo:      { label: 'Nuevo',      color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  contactado: { label: 'Contactado', color: '#f59e0b', bg: '#fefce8', border: '#fde68a' },
  en_proceso: { label: 'En proceso', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  cerrado:    { label: 'Cerrado',    color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  perdido:    { label: 'Perdido',    color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
}

const PAY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pagado:       { label: '✓ Pagado',       color: '#10b981', bg: '#f0fdf4' },
  parcial:      { label: '◐ Parcial',      color: '#3b82f6', bg: '#eff6ff' },
  pendiente:    { label: '⏳ Pendiente',    color: '#f59e0b', bg: '#fefce8' },
  vencido:      { label: '⚠️ Vencido',     color: '#ef4444', bg: '#fef2f2' },
  sin_contrato: { label: '○ Sin contrato', color: '#94a3b8', bg: '#f1f5f9' },
}

const PAGE_SIZE = 5

// ─── Helpers ─────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const p = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316', '#14b8a6']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length
  return p[h]
}

// ─── Edit Modal ───────────────────────────────────────────────────

type EditForm = {
  nombre: string; email: string; telefono: string; servicio: string
  estado: string; payment_status: string; estimated_value: string; notes: string
}

function EditModal({
  lead, onClose, onSaved,
}: {
  lead: Lead
  onClose: () => void
  onSaved: (updated: Lead) => void
}) {
  const [form, setForm] = useState<EditForm>({
    nombre:          lead.nombre ?? '',
    email:           lead.email ?? '',
    telefono:        lead.telefono ?? '',
    servicio:        lead.servicio ?? '',
    estado:          lead.estado ?? 'nuevo',
    payment_status:  lead.payment_status ?? 'pendiente',
    estimated_value: lead.estimated_value != null ? String(lead.estimated_value) : '',
    notes:           lead.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/lead-edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:              lead.id,
          nombre:          form.nombre.trim(),
          email:           form.email.trim() || null,
          telefono:        form.telefono.trim() || null,
          servicio:        form.servicio.trim() || null,
          estado:          form.estado,
          payment_status:  form.payment_status,
          estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
          notes:           form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setError(data.error ?? 'Error al guardar.'); return }
      onSaved({
        ...lead,
        nombre:          form.nombre.trim(),
        email:           form.email.trim() || null,
        telefono:        form.telefono.trim() || null,
        servicio:        form.servicio.trim() || null,
        estado:          form.estado,
        payment_status:  form.payment_status,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        notes:           form.notes.trim() || null,
      })
    } catch { setError('Error de conexión.') }
    finally   { setLoading(false) }
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5,
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid #e2e8f0', borderRadius: 9,
    outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg, #00113a 0%, #2552ca 100%)', padding: '18px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#fff' }}>✏️ Editar cliente</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{lead.folio ?? lead.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Nombre del cliente *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} style={inp} placeholder="Ej: Juan Pérez" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div><label style={lbl}>Email</label><input name="email" type="email" value={form.email} onChange={handleChange} style={inp} placeholder="cliente@ejemplo.com" /></div>
            <div><label style={lbl}>Teléfono / WhatsApp</label><input name="telefono" value={form.telefono} onChange={handleChange} style={inp} placeholder="+593 99 000 0000" /></div>
          </div>
          <div><label style={lbl}>Servicio</label><input name="servicio" value={form.servicio} onChange={handleChange} style={inp} placeholder="Ej: 500 tarjetas de presentación" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={lbl}>Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange} style={inp}>
                {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Estado de pago</label>
              <select name="payment_status" value={form.payment_status} onChange={handleChange} style={inp}>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="pagado">Pagado</option>
                <option value="vencido">Vencido</option>
                <option value="sin_contrato">Sin contrato</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Valor estimado ($)</label><input name="estimated_value" type="number" min="0" step="0.01" value={form.estimated_value} onChange={handleChange} style={inp} placeholder="Ej: 250" /></div>
          <div><label style={lbl}>Notas internas</label><textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Observaciones, detalles del pedido, fecha de entrega…" /></div>

          {error && <p style={{ margin: 0, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', color: '#475569', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ background: loading ? '#93c5fd' : '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export default function LeadsClient({ leads: initLeads }: { leads: Lead[] }) {
  const router = useRouter()

  const [leads, setLeads]               = useState<Lead[]>(initLeads)
  const [search, setSearch]             = useState('')
  const [folioSearch, setFolioSearch]   = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [page, setPage]                 = useState(1)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [editingLead, setEditingLead]   = useState<Lead | null>(null)

  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Filtered & paginated ──────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads.filter(l => {
      const matchEstado = filterEstado === 'todos' || l.estado === filterEstado
      const matchSearch = !q ||
        l.nombre.toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.servicio ?? '').toLowerCase().includes(q) ||
        (l.folio ?? '').toLowerCase().includes(q)
      return matchEstado && matchSearch
    })
  }, [leads, search, filterEstado])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Folio search (right panel) ────────────────────────────────

  const folioResult = useMemo(() => {
    const q = folioSearch.trim().toLowerCase()
    if (!q) return null
    return leads.find(l => (l.folio ?? '').toLowerCase() === q) ?? null
  }, [leads, folioSearch])

  // ── Stats ─────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:   leads.length,
    nuevo:   leads.filter(l => l.estado === 'nuevo').length,
    cerrado: leads.filter(l => l.estado === 'cerrado').length,
    perdido: leads.filter(l => l.estado === 'perdido').length,
    vencido: leads.filter(l => l.payment_status === 'vencido').length,
  }), [leads])

  // ── Soft delete (archivar → estado perdido) ───────────────────
  //    Nota: este NO elimina de BD, solo cambia el estado.

  async function archiveLead(lead: Lead) {
    const msg = `¿Archivar a "${lead.nombre}"?\n\nSe marcará como "Perdido" para conservar el historial.\nSu folio ${lead.folio ?? ''} quedará registrado pero inactivo.`
    if (!confirm(msg)) return
    setDeleting(lead.id)
    try {
      const res = await fetch('/api/admin/lead-estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, estado: 'perdido' }),
      })
      if (res.ok) {
        // Actualizar UI localmente
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, estado: 'perdido' } : l))
        showMsg(`"${lead.nombre}" archivado como Perdido`)
        // Sincronizar con servidor para que el cambio persista en F5
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        showMsg(data.error ?? 'Error al archivar', false)
      }
    } catch {
      showMsg('Error de conexión al archivar', false)
    } finally {
      setDeleting(null)
    }
  }

  // ── Hard delete (eliminar permanente de BD) ───────────────────
  //    FIX: router.refresh() después de DELETE exitoso para que
  //    el servidor re-lea la BD y F5 ya no muestre el registro.

  async function hardDeleteLead(lead: Lead) {
    const msg = `¿ELIMINAR PERMANENTEMENTE a "${lead.nombre}"?\n\n⚠️ Esta acción NO se puede deshacer.\nFolio: ${lead.folio ?? 'sin folio'}`
    if (!confirm(msg)) return
    setDeleting(lead.id)
    try {
      const res = await fetch(`/api/admin/lead-estado?id=${encodeURIComponent(lead.id)}&hard=1`, {
        method: 'DELETE',
      })
      if (res.ok) {
        // 1. Quitar del estado local para feedback inmediato
        setLeads(prev => prev.filter(l => l.id !== lead.id))
        showMsg(`"${lead.nombre}" eliminado permanentemente`)
        // 2. CRÍTICO: refrescar caché del servidor para que F5 ya no lo muestre
        router.refresh()
      } else {
        let errMsg = 'Error al eliminar'
        try {
          const data = await res.json()
          errMsg = data.error ?? errMsg
        } catch { /* ignorar */ }
        showMsg(errMsg, false)
      }
    } catch {
      showMsg('Error de conexión al eliminar', false)
    } finally {
      setDeleting(null)
    }
  }

  // ── Save edit ─────────────────────────────────────────────────

  function handleSaved(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setEditingLead(null)
    showMsg(`"${updated.nombre}" actualizado correctamente`)
    router.refresh()
  }

  // ── Navigate to Vista360 ──────────────────────────────────────

  function goToLead(lead: Lead) {
    if (lead.folio) router.push(`/admin/cliente/${lead.folio}`)
  }

  // ─── Render ──────────────────────────────────────────────────
  const sLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }
  const inp: React.CSSProperties    = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }
  const card: React.CSSProperties   = { background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Edit Modal */}
      {editingLead && (
        <EditModal lead={editingLead} onClose={() => setEditingLead(null)} onSaved={handleSaved} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', animation: 'slideIn 0.3s ease',
          maxWidth: 340,
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>👤 Contactos</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{stats.total} contactos registrados</p>
        </div>
        <NuevoLeadModal />
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total',    value: stats.total,   color: '#0f172a', icon: '📋' },
          { label: 'Nuevos',   value: stats.nuevo,   color: '#3b82f6', icon: '🆕' },
          { label: 'Cerrados', value: stats.cerrado, color: '#10b981', icon: '✅' },
          { label: 'Perdidos', value: stats.perdido, color: '#ef4444', icon: '❌' },
          { label: 'Vencidos', value: stats.vencido, color: '#f59e0b', icon: '⚠️' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Main layout: table + right panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18, alignItems: 'start' }} className="leads-grid">

        {/* ── Left: Table ─────────────────────────────────── */}
        <div style={card}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="🔍 Buscar por nombre, email, servicio…"
              style={{ ...inp, flex: '1 1 200px', minWidth: 180 }}
            />
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['todos', 'nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido'].map(e => {
                const cfg = e === 'todos'
                  ? { label: 'Todos', color: '#0f172a', bg: '#f1f5f9', border: '#e2e8f0' }
                  : ESTADO_CFG[e]
                const active = filterEstado === e
                return (
                  <button key={e} onClick={() => { setFilterEstado(e); setPage(1) }}
                    style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${active ? cfg.color : '#e2e8f0'}`, background: active ? cfg.color : '#fff', color: active ? '#fff' : '#64748b', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results count */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 500 }}>
            Mostrando {paginated.length} de {filtered.length} contactos
          </div>

          {/* Table */}
          <div style={{ borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 580 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Contacto', 'Servicio', 'Estado', 'Pago', 'Valor est.', 'Fecha', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                        Sin contactos que coincidan
                      </td>
                    </tr>
                  ) : paginated.map(lead => {
                    const ec      = ESTADO_CFG[lead.estado ?? 'nuevo'] ?? ESTADO_CFG.nuevo
                    const pc      = PAY_CFG[lead.payment_status ?? 'sin_contrato'] ?? PAY_CFG.sin_contrato
                    const hasLink = !!lead.folio
                    const isDeleting = deleting === lead.id
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => hasLink && goToLead(lead)}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: hasLink ? 'pointer' : 'default', transition: 'background 0.12s', opacity: isDeleting ? 0.5 : 1 }}
                        onMouseEnter={e => { if (hasLink && !isDeleting) e.currentTarget.style.background = '#f8fafc' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '' }}
                      >
                        {/* Contacto */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                              {initials(lead.nombre)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{lead.nombre}</div>
                              {lead.folio && <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>{lead.folio}</div>}
                              {lead.email && <div style={{ fontSize: 11, color: '#64748b' }}>{lead.email}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Servicio */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 12, color: '#475569' }}>{lead.servicio ?? '—'}</span>
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`, whiteSpace: 'nowrap' }}>
                            {ec.label}
                          </span>
                        </td>

                        {/* Pago */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: pc.bg, color: pc.color, whiteSpace: 'nowrap' }}>
                            {pc.label}
                          </span>
                        </td>

                        {/* Valor */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {fmtMoney(lead.estimated_value)}
                        </td>

                        {/* Fecha */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {fmtDate(lead.created_at)}
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>

                            {/* Ver Vista 360 */}
                            {hasLink && (
                              <a href={`/admin/cliente/${lead.folio}`} title="Ver Vista 360"
                                style={{ fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                Ver →
                              </a>
                            )}

                            {/* Editar */}
                            <button
                              onClick={() => setEditingLead(lead)}
                              title="Editar cliente"
                              disabled={isDeleting}
                              style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, background: '#fefce8', color: '#b45309', border: '1px solid #fde68a', cursor: isDeleting ? 'not-allowed' : 'pointer' }}>
                              ✏️
                            </button>

                            {/* Archivar (soft delete → estado perdido) */}
                            <button
                              onClick={() => archiveLead(lead)}
                              disabled={isDeleting || lead.estado === 'perdido'}
                              title={lead.estado === 'perdido' ? 'Ya archivado' : 'Archivar como Perdido'}
                              style={{
                                fontSize: 12, padding: '5px 8px', borderRadius: 6,
                                background: lead.estado === 'perdido' ? '#f8fafc' : '#fef2f2',
                                color: lead.estado === 'perdido' ? '#cbd5e1' : '#ef4444',
                                border: 'none',
                                cursor: isDeleting || lead.estado === 'perdido' ? 'not-allowed' : 'pointer',
                              }}>
                              {isDeleting ? '…' : '🗑️'}
                            </button>

                            {/* Eliminar permanente */}
                            <button
                              onClick={() => hardDeleteLead(lead)}
                              disabled={isDeleting}
                              title="Eliminar permanentemente de la base de datos"
                              style={{
                                fontSize: 12, padding: '5px 8px', borderRadius: 6,
                                background: '#fee2e2', color: '#b91c1c',
                                border: '1px solid #fecaca',
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontWeight: 700,
                              }}>
                              {isDeleting ? '…' : '✕'}
                            </button>

                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: '#475569', fontWeight: 600, opacity: page === 1 ? 0.4 : 1 }}>
                ← Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === n ? '#0f172a' : '#fff', color: page === n ? '#fff' : '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12, color: '#475569', fontWeight: 600, opacity: page === totalPages ? 0.4 : 1 }}>
                Siguiente →
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Panel ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Folio search */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>🔎 Buscar por Folio</div>
            <label style={sLabel}>Número de folio</label>
            <input
              type="text" value={folioSearch}
              onChange={e => setFolioSearch(e.target.value)}
              placeholder="Ej: ASMKT-0388"
              style={inp}
            />
            {folioSearch && (
              <div style={{ marginTop: 12 }}>
                {folioResult ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{folioResult.nombre}</div>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', marginBottom: 8 }}>{folioResult.folio}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>📧 {folioResult.email ?? '—'}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>🛠 {folioResult.servicio ?? '—'}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {folioResult.folio && (
                        <a href={`/admin/cliente/${folioResult.folio}`}
                          style={{ flex: 1, display: 'block', textAlign: 'center', padding: '8px', background: '#0f172a', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                          Ver Vista 360 →
                        </a>
                      )}
                      <button onClick={() => setEditingLead(folioResult)}
                        style={{ padding: '8px 10px', background: '#fefce8', color: '#b45309', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                        ✏️
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                    No se encontró el folio &quot;{folioSearch}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>📈 Estado financiero</div>
            {Object.entries(PAY_CFG).map(([key, cfg]) => {
              const count = leads.filter(l => (l.payment_status ?? 'sin_contrato') === key).length
              if (count === 0) return null
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Recent activity */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>🕐 Más recientes</div>
            {leads.slice(0, 5).map(lead => {
              const ec = ESTADO_CFG[lead.estado ?? 'nuevo'] ?? ESTADO_CFG.nuevo
              return (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <a href={lead.folio ? `/admin/cliente/${lead.folio}` : '#'}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textDecoration: 'none', minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarBg(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {initials(lead.nombre)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.nombre}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{fmtDate(lead.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: ec.bg, color: ec.color, whiteSpace: 'nowrap' }}>{ec.label}</span>
                  </a>
                  <button onClick={() => setEditingLead(lead)} title="Editar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', flexShrink: 0 }}>
                    ✏️
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 900px) {
          .leads-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .leads-grid > div:first-child input[type="text"] { min-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
