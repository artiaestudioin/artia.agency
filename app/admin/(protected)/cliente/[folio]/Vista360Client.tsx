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

type Installment = {
  id?: string
  payment_id: string
  amount: number | string
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
}

type Project = {
  id: string; name: string; access_code: string
  status: string; event_date: string | null; created_at: string
} | null

type ProjectFile = {
  id: string; file_url: string; file_name: string | null; file_type: string | null
}

type InstallmentForm = {
  id?: string
  amount: string
  payment_date: string
  status: 'pagado' | 'pendiente' | 'vencido'
  payment_method: string
  receipt_url?: string | null
  payment_number: number
}

type ContractForm = {
  contract_value: string
  description: string
  payment_month: string
  installments: InstallmentForm[]
}

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
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  cheque:        'Cheque',
  otro:          'Otro',
}

const ESTADO_INST: Record<string, { bg: string; text: string; dot: string }> = {
  pagado:    { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  pendiente: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  vencido:   { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

// ─── Helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const p = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length
  return p[h]
}

function makeInstForm(date: string, num: number): InstallmentForm {
  return { amount: '', payment_date: date, status: 'pendiente', payment_method: 'transferencia', payment_number: num }
}

// ─── Component ─────────────────────────────────────────────────────

export default function Vista360Client({
  lead: initLead,
  paymentParents: initParents,
  project,
  projectFiles,
}: {
  lead: Lead
  paymentParents: PaymentParent[]
  project: Project
  projectFiles: ProjectFile[]
}) {
  const router = useRouter()

  const [lead, setLead]               = useState(initLead)
  const [parents, setParents]         = useState<PaymentParent[]>(initParents)
  const [notes, setNotes]             = useState(initLead.notes ?? '')
  const [editNotes, setEditNotes]     = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)

  // Formulario contrato
  const [showContractForm, setShowContractForm] = useState(false)
  const [editParent, setEditParent]   = useState<PaymentParent | null>(null)
  const [savingContract, setSavingContract] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  // Email
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailForm, setEmailForm] = useState({ asunto: `Hola ${initLead.nombre} — Artia Studio`, cuerpo: '' })
  const [sendingEmail, setSendingEmail]   = useState(false)

  // FIX HIDRATACIÓN: fechas solo en cliente
  const [mounted, setMounted]     = useState(false)
  const [mesActual, setMesActual] = useState('')
  const [anioActual, setAnioActual] = useState(0)
  const [fechaHoy, setFechaHoy]   = useState('')

  useEffect(() => {
    const d = new Date()
    const mes = MESES[d.getMonth()] + ' ' + d.getFullYear()
    setMesActual(mes)
    setAnioActual(d.getFullYear())
    setFechaHoy(d.toISOString().slice(0, 10))
    setMounted(true)
  }, [])

  const [contractForm, setContractForm] = useState<ContractForm>({
    contract_value: '', description: '', payment_month: '', installments: [],
  })

  useEffect(() => {
    if (!mounted) return
    setContractForm(f =>
      f.installments.length === 0
        ? { ...f, payment_month: f.payment_month || mesActual, installments: [makeInstForm(fechaHoy, 1), makeInstForm(fechaHoy, 2)] }
        : f,
    )
  }, [mounted, mesActual, fechaHoy])

  // ── Helpers ──────────────────────────────────────────────────────
  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function addInst() {
    setContractForm(f => ({
      ...f,
      installments: [...f.installments, makeInstForm(fechaHoy, f.installments.length + 1)],
    }))
  }

  function removeInst(idx: number) {
    setContractForm(f => ({
      ...f,
      installments: f.installments
        .filter((_, i) => i !== idx)
        .map((inst, i) => ({ ...inst, payment_number: i + 1 })),
    }))
  }

  function updateInst(idx: number, field: keyof InstallmentForm, value: any) {
    setContractForm(f => ({
      ...f,
      installments: f.installments.map((inst, i) => i === idx ? { ...inst, [field]: value } : inst),
    }))
  }

  async function uploadReceipt(file: File, idx: number) {
    setUploadingIndex(idx)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('payment_id', editParent?.id || 'new')
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) { updateInst(idx, 'receipt_url', data.url); showMsg('Comprobante adjuntado ✓') }
      else showMsg('Error subiendo comprobante', false)
    } finally { setUploadingIndex(null) }
  }

  function openNewContract() {
    setEditParent(null)
    setContractForm({
      contract_value: '', description: '', payment_month: mesActual,
      installments: [makeInstForm(fechaHoy, 1), makeInstForm(fechaHoy, 2)],
    })
    setShowContractForm(true)
  }

  function openEditContract(p: PaymentParent) {
    setEditParent(p)
    setContractForm({
      contract_value: String(p.contract_value),
      description: p.description ?? '',
      payment_month: p.payment_month ?? mesActual,
      installments: [...p.installments]
        .sort((a, b) => a.payment_number - b.payment_number)
        .map(inst => ({
          id: inst.id,
          amount: String(inst.amount),
          payment_date: (inst.payment_date ?? '').split('T')[0],
          status: inst.status,
          payment_method: inst.payment_method ?? 'transferencia',
          receipt_url: inst.receipt_url ?? null,
          payment_number: inst.payment_number,
        })),
    })
    setShowContractForm(true)
  }

  async function saveContract(e: React.FormEvent) {
    e.preventDefault()
    if (!contractForm.contract_value || contractForm.installments.length === 0) return
    setSavingContract(true)
    try {
      const body = {
        lead_id: lead.id,
        contract_value: parseFloat(contractForm.contract_value),
        description: contractForm.description || null,
        payment_month: contractForm.payment_month || null,
        installments: contractForm.installments.map(inst => ({
          ...inst,
          amount: parseFloat(inst.amount),
          id: inst.id,
        })),
      }

      if (editParent) {
        const res  = await fetch(`/api/admin/payments/${editParent.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok) {
          const refreshRes  = await fetch('/api/admin/payments')
          const refreshData = await refreshRes.json()
          const myParents   = (refreshData.payments ?? []).filter((p: PaymentParent) => p.lead_id === lead.id)
          setParents(myParents)
          showMsg('Contrato actualizado ✓')
          setShowContractForm(false)
          setEditParent(null)
        } else showMsg(data.error ?? 'Error', false)
      } else {
        const res  = await fetch('/api/admin/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.parent) {
          setParents(prev => [data.parent, ...prev])
          showMsg('Contrato registrado ✓')
          setShowContractForm(false)
          router.refresh()
        } else showMsg(data.error ?? 'Error', false)
      }
    } finally { setSavingContract(false) }
  }

  async function deleteParent(id: string) {
    if (!confirm('¿Eliminar este contrato y todas sus cuotas?')) return
    const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' })
    if (res.ok) { setParents(prev => prev.filter(p => p.id !== id)); showMsg('Contrato eliminado') }
    else showMsg('Error eliminando', false)
  }

  async function changeEstado(newEstado: string) {
    const res = await fetch('/api/admin/lead-estado', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, estado: newEstado }),
    })
    if (res.ok) { setLead(l => ({ ...l, estado: newEstado })); showMsg('Estado actualizado') }
    else showMsg('Error actualizando estado', false)
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

  async function createProjectForLead() {
    setCreatingProject(true)
    try {
      const res  = await fetch('/api/admin/pipeline-cerrado', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (res.ok) { showMsg('Proyecto creado y acceso enviado ✓'); router.refresh() }
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

  // Totales
  const totalPagado    = parents.reduce((s, p) => s + p.installments.filter(i => i.status === 'pagado').reduce((ss, i) => ss + (parseFloat(i.amount as any) || 0), 0), 0)
  const totalPendiente = parents.reduce((s, p) => s + p.installments.filter(i => i.status !== 'pagado').reduce((ss, i) => ss + (parseFloat(i.amount as any) || 0), 0), 0)
  const totalContrato  = parents.reduce((s, p) => s + (p.contract_value || 0), 0)

  const estadoCfg = ESTADO_CFG[lead.estado ?? 'nuevo'] ?? ESTADO_CFG.nuevo

  // Styles
  const sLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
    color: '#94a3b8', display: 'block', marginBottom: 5,
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
  }
  const inpSm: React.CSSProperties = { ...inp, padding: '7px 10px', fontSize: 12 }
  const card: React.CSSProperties  = {
    background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '18px 20px',
  }

  // ─── Render ──────────────────────────────────────────────────────
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
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: 'calc(100vw - 40px)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, background: avatarBg(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {initials(lead.nombre)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#00113a', margin: 0 }}>{lead.nombre}</h1>
              <span style={{ fontSize: 10, fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                {estadoCfg.label.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lead.folio    && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{lead.folio}</span>}
              {lead.email    && <span style={{ color: '#2552ca', wordBreak: 'break-all' }}>{lead.email}</span>}
              {lead.telefono && <span>{lead.telefono}</span>}
            </div>
          </div>
        </div>
        <Link href="/admin/leads" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none', padding: '8px 14px', background: '#f1f5f9', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          ← Volver
        </Link>
      </div>

      {/* Grid principal */}
      <div className="vista360-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>

        {/* ── Columna izquierda ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Info */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a', marginBottom: 12 }}>📋 Información</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <div><span style={sLabel}>Servicio</span><span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{lead.servicio ?? '—'}</span></div>
              <div><span style={sLabel}>Fecha ingreso</span><span style={{ fontSize: 13 }}>{fmtDate(lead.created_at)}</span></div>
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

          {/* Estado pipeline */}
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
                  }}>{cfg.label}</button>
                )
              })}
            </div>
          </div>

          {/* Notas */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>📝 Notas internas</div>
              <button onClick={() => editNotes ? saveNotes() : setEditNotes(true)} disabled={savingNotes} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: editNotes ? '#00113a' : '#f1f5f9', color: editNotes ? '#fff' : '#475569' }}>
                {savingNotes ? 'Guardando…' : editNotes ? 'Guardar' : 'Editar'}
              </button>
            </div>
            {editNotes ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} placeholder="Notas internas…" />
            ) : (
              <p style={{ fontSize: 13, color: notes ? '#475569' : '#94a3b8', margin: 0, lineHeight: 1.7, fontStyle: notes ? 'normal' : 'italic' }}>
                {notes || 'Sin notas. Haz clic en Editar para agregar.'}
              </p>
            )}
          </div>

          {/* ── CONTRATOS Y CUOTAS ─────────────────────────────── */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>💰 Contratos y pagos</div>
              <button onClick={openNewContract} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#00113a', color: '#fff' }}>
                + Nuevo contrato
              </button>
            </div>

            {/* Resumen */}
            {totalContrato > 0 && (() => {
              const pct = Math.min((totalPagado / totalContrato) * 100, 100)
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 110px', background: '#f0fdf4', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={sLabel}>Cobrado</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#10b981' }}>{fmtMoney(totalPagado)}</div>
                    </div>
                    {totalPendiente > 0 && (
                      <div style={{ flex: '1 1 110px', background: '#fef9ec', borderRadius: 8, padding: '9px 12px' }}>
                        <div style={sLabel}>Pendiente</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#d97706' }}>{fmtMoney(totalPendiente)}</div>
                      </div>
                    )}
                    <div style={{ flex: '1 1 110px', background: '#f8fafc', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={sLabel}>Total contratos</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{fmtMoney(totalContrato)}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                      <span>Progreso total</span><span>{Math.round(pct)}%</span>
                    </div>
                    <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#2552ca', borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Formulario contrato */}
            {showContractForm && (
              <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#00113a' }}>
                    {editParent ? '✏️ Editar contrato' : '➕ Nuevo contrato'}
                  </span>
                  <button onClick={() => { setShowContractForm(false); setEditParent(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
                </div>

                <form onSubmit={saveContract}>
                  {/* Valor */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={sLabel}>Valor Total del Contrato (USD) *</label>
                    <input type="number" step="0.01" min="0" required placeholder="0.00"
                      value={contractForm.contract_value}
                      onChange={e => setContractForm(f => ({ ...f, contract_value: e.target.value }))}
                      style={inp} />
                  </div>

                  {/* Mes */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={sLabel}>Mes de Referencia</label>
                    <input type="text" value={contractForm.payment_month}
                      onChange={e => setContractForm(f => ({ ...f, payment_month: e.target.value }))}
                      style={inp} placeholder={mesActual} />
                    {mounted && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
                        {MESES.map(m => (
                          <button key={m} type="button"
                            onClick={() => setContractForm(f => ({ ...f, payment_month: `${m} ${anioActual}` }))}
                            style={{ fontSize: 9, padding: '2px 7px', borderRadius: 7, border: '0.5px solid #e2e8f0', background: contractForm.payment_month?.startsWith(m) ? '#00113a' : '#fff', color: contractForm.payment_month?.startsWith(m) ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 700 }}>
                            {m.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={sLabel}>Descripción</label>
                    <input type="text" value={contractForm.description}
                      onChange={e => setContractForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Ej: Proyecto web — 50% anticipo" style={inp} />
                  </div>

                  {/* Cuotas */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                      <label style={{ ...sLabel, marginBottom: 0 }}>Cuotas del contrato</label>
                      <button type="button" onClick={addInst} style={{ padding: '4px 10px', background: '#00113a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        + Añadir cuota
                      </button>
                    </div>

                    {contractForm.installments.map((inst, idx) => (
                      <div key={idx} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 9, padding: '11px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#00113a' }}>Cuota #{inst.payment_number}</span>
                          {contractForm.installments.length > 1 && (
                            <button type="button" onClick={() => removeInst(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={sLabel}>Monto (USD) *</label>
                            <input type="number" step="0.01" min="0" required placeholder="0.00"
                              value={inst.amount} onChange={e => updateInst(idx, 'amount', e.target.value)} style={inpSm} />
                          </div>
                          <div>
                            <label style={sLabel}>Fecha de Pago *</label>
                            <input type="date" required value={inst.payment_date}
                              onChange={e => updateInst(idx, 'payment_date', e.target.value)} style={inpSm} />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={sLabel}>Estado</label>
                            <select value={inst.status} onChange={e => updateInst(idx, 'status', e.target.value as any)} style={inpSm}>
                              <option value="pendiente">⏳ Pendiente</option>
                              <option value="pagado">✓ Pagado</option>
                              <option value="vencido">❌ Vencido</option>
                            </select>
                          </div>
                          <div>
                            <label style={sLabel}>Tipo de Pago</label>
                            <select value={inst.payment_method ?? 'transferencia'} onChange={e => updateInst(idx, 'payment_method', e.target.value)} style={inpSm}>
                              {Object.entries(METHOD_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={sLabel}>Comprobante</label>
                          {inst.receipt_url ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#eff6ff', borderRadius: 7, border: '1px solid #bfdbfe' }}>
                              <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2552ca', fontWeight: 700 }}>Ver ↗</a>
                              <button type="button" onClick={() => updateInst(idx, 'receipt_url', null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>×</button>
                            </div>
                          ) : (
                            <div onClick={() => fileRefs.current[idx]?.click()} style={{ border: '2px dashed #e2e8f0', borderRadius: 7, padding: '8px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                              {uploadingIndex === idx ? '⏳ Subiendo…' : '📎 Adjuntar'}
                            </div>
                          )}
                          <input ref={el => { fileRefs.current[idx] = el }} type="file" accept="image/*,application/pdf"
                            style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f, idx) }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="submit" disabled={savingContract} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: savingContract ? 'not-allowed' : 'pointer', opacity: savingContract ? 0.7 : 1, flex: 1 }}>
                      {savingContract ? '⏳ Guardando…' : editParent ? '💾 Actualizar' : '💾 Guardar contrato'}
                    </button>
                    <button type="button" onClick={() => { setShowContractForm(false); setEditParent(null) }} style={{ background: '#f1f5f9', color: '#64748b', border: '0.5px solid #e2e8f0', borderRadius: 9, padding: '10px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de contratos */}
            {parents.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Sin contratos registrados aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {parents.map(p => {
                  const pagadoP       = p.installments.filter(i => i.status === 'pagado').reduce((s, i) => s + (parseFloat(i.amount as any) || 0), 0)
                  const pct           = p.contract_value > 0 ? Math.min((pagadoP / p.contract_value) * 100, 100) : 0
                  const todasPagadas  = p.installments.length > 0 && p.installments.every(i => i.status === 'pagado')
                  const algunaVencida = p.installments.some(i =>
                    i.status === 'pendiente' && i.payment_date &&
                    new Date(i.payment_date.split('T')[0]) < new Date(new Date().toDateString()),
                  )

                  return (
                    <div key={p.id} style={{ border: `1px solid ${todasPagadas ? '#bbf7d0' : algunaVencida ? '#fecaca' : '#e2e8f0'}`, borderRadius: 10, overflow: 'hidden' }}>

                      {/* Cabecera */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', flexWrap: 'wrap', gap: 8, background: todasPagadas ? '#f0fdf4' : algunaVencida ? '#fef2f2' : '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{fmtMoney(p.contract_value)}</span>
                          {p.payment_month && (
                            <span style={{ fontSize: 10, color: '#64748b', background: '#fff', padding: '2px 8px', borderRadius: 8, border: '0.5px solid #e2e8f0' }}>{p.payment_month}</span>
                          )}
                          <span style={{ fontSize: 10, fontWeight: 800, color: todasPagadas ? '#166534' : algunaVencida ? '#991b1b' : '#92400e', background: todasPagadas ? '#dcfce7' : algunaVencida ? '#fee2e2' : '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>
                            {todasPagadas ? '✓ Completado' : algunaVencida ? '⚠️ Con vencidas' : '⏳ En progreso'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => openEditContract(p)} style={{ fontSize: 11, color: '#2552ca', background: '#eff6ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>✏️ Editar</button>
                          <button onClick={() => deleteParent(p.id)} style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}>🗑️</button>
                        </div>
                      </div>

                      {/* Descripción */}
                      {p.description && (
                        <div style={{ padding: '5px 14px 0', fontSize: 11, color: '#64748b' }}>{p.description}</div>
                      )}

                      {/* Barra progreso */}
                      <div style={{ padding: '7px 14px 0' }}>
                        <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#667eea', borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, textAlign: 'right' }}>
                          {Math.round(pct)}% · {fmtMoney(pagadoP)} de {fmtMoney(p.contract_value)}
                        </div>
                      </div>

                      {/* Cuotas */}
                      <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[...p.installments].sort((a, b) => a.payment_number - b.payment_number).map(inst => {
                          const ec = ESTADO_INST[inst.status] ?? ESTADO_INST.pendiente
                          const vencida = inst.status === 'pendiente' && inst.payment_date &&
                            new Date(inst.payment_date.split('T')[0]) < new Date(new Date().toDateString())
                          return (
                            <div key={inst.id ?? inst.payment_number} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 6, background: ec.bg, fontSize: 11, flexWrap: 'wrap' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ec.dot, flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, color: ec.text, whiteSpace: 'nowrap' }}>
                                #{inst.payment_number}: {fmtMoney(parseFloat(inst.amount as any))}
                              </span>
                              <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(inst.payment_date)}</span>
                              {inst.payment_method && (
                                <span style={{ color: '#94a3b8', fontSize: 10, whiteSpace: 'nowrap' }}>
                                  {METHOD_LABELS[inst.payment_method] ?? inst.payment_method}
                                </span>
                              )}
                              {vencida && <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 10 }}>⚠️ Vencida</span>}
                              {inst.receipt_url && (
                                <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700, fontSize: 10 }}>📎</a>
                              )}
                            </div>
                          )
                        })}
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
                <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569' }}>
                  {showEmailForm ? 'Cancelar' : 'Redactar'}
                </button>
              </div>
              {showEmailForm ? (
                <form onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div><label style={sLabel}>Para</label><input value={lead.email} readOnly style={{ ...inp, background: '#f8fafc', color: '#64748b' }} /></div>
                  <div><label style={sLabel}>Asunto</label><input value={emailForm.asunto} onChange={e => setEmailForm(p => ({ ...p, asunto: e.target.value }))} style={inp} required /></div>
                  <div>
                    <label style={sLabel}>Mensaje</label>
                    <textarea value={emailForm.cuerpo} onChange={e => setEmailForm(p => ({ ...p, cuerpo: e.target.value }))} rows={5} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} required placeholder={`Hola ${lead.nombre},\n\n`} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={sendingEmail} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {sendingEmail ? 'Enviando…' : 'Enviar email →'}
                    </button>
                    <Link href="/admin/emails" style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', color: '#475569', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
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
                  <button onClick={() => navigator.clipboard.writeText(project!.access_code).then(() => showMsg('Código copiado'))} style={{ fontSize: 10, background: 'none', border: '0.5px solid #e2e8f0', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', color: '#64748b' }}>
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
                  <a href={`/client/${project.access_code}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2552ca', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 6, padding: '5px 11px', textDecoration: 'none', fontWeight: 700 }}>
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
                <button onClick={createProjectForLead} disabled={creatingProject} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
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
                <a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 13px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#10b981', textDecoration: 'none', border: '0.5px solid #bbf7d0' }}>
                  💬 WhatsApp
                </a>
              )}
              <Link href="/admin/pipeline" style={{ display: 'block', padding: '10px 13px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                🗂️ Ver en pipeline
              </Link>
              <Link href="/admin/emails" style={{ display: 'block', padding: '10px 13px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                📨 Plantillas de email
              </Link>
              <Link href="/admin/finanzas" style={{ display: 'block', padding: '10px 13px', background: '#f8fafc', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', border: '0.5px solid #e2e8f0' }}>
                💰 Ver en Finanzas
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .vista360-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}