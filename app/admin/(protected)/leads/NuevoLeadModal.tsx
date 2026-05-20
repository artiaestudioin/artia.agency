'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ESTADOS = [
  { label: 'Nuevo', value: 'nuevo' },
  { label: 'Contactado', value: 'contactado' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Cerrado', value: 'cerrado' },
  { label: 'Perdido', value: 'perdido' },
] as const

// FIX: Eliminados 'sin_contrato' y 'vencido' — no son válidos en leads.payment_status
// Constraint DB: (payment_status = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'pagado'::text]))
const PAYMENT_STATUSES = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Pagado', value: 'pagado' },
] as const

const SERVICIOS = [
  { label: 'Marketing Digital / Redes Sociales', value: 'marketing' },
  { label: 'Impresión / Papelería', value: 'impresion' },
  { label: 'Fotografía / Video / Drone', value: 'fotografia' },
  { label: 'Branding / Diseño Gráfico', value: 'branding' },
  { label: 'Página Web / Landing', value: 'web' },
  { label: 'Otro', value: 'otro' },
]

const sLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '1.2px',
  textTransform: 'uppercase',
  color: '#94a3b8',
  display: 'block',
  marginBottom: 5,
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '0.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0f172a',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const inpFocus: React.CSSProperties = {
  borderColor: '#2552ca',
  boxShadow: '0 0 0 3px rgba(37, 82, 202, 0.08)',
}

export default function NuevoLeadModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [folio, setFolio] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    servicio: '',
    categoria: 'marketing',
    estado: 'nuevo',
    payment_status: 'pendiente', // FIX: era 'sin_contrato', ahora 'pendiente'
    estimated_value: '',
    mensaje: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'categoria') {
        next.servicio = SERVICIOS.find((s) => s.value === value)?.label ?? ''
      }
      return next
    })
    setError('')
  }

  function getFieldStyle(fieldName: string): React.CSSProperties {
    return {
      ...inp,
      ...(focusedField === fieldName ? inpFocus : {}),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // FIX: Validar email obligatorio (NOT NULL en DB)
    if (!form.nombre.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return
    }
    if (!form.email.trim()) {
      setError('El email es obligatorio.')
      return
    }
    if (!form.servicio.trim()) {
      setError('El servicio es obligatorio.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim() || null,
        servicio: form.servicio.trim(),
        categoria: form.categoria,
        estado: form.estado,
        payment_status: form.payment_status,
        estimated_value:
          form.estimated_value !== '' && form.estimated_value !== null
            ? parseFloat(form.estimated_value)
            : null,
        mensaje: form.mensaje.trim() || null,
      }

      const res = await fetch('/api/admin/lead-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error al crear el lead.')
        return
      }

      setFolio(data.folio)
      router.refresh()
    } catch (err) {
      console.error('Create lead error:', err)
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function cerrar() {
    setOpen(false)
    setFolio(null)
    setError('')
    setFocusedField(null)
    setForm({
      nombre: '',
      email: '',
      telefono: '',
      servicio: '',
      categoria: 'marketing',
      estado: 'nuevo',
      payment_status: 'pendiente',
      estimated_value: '',
      mensaje: '',
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#2552ca',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.3px',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 8px rgba(37, 82, 202, 0.25)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1e45b0'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 82, 202, 0.35)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2552ca'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 82, 202, 0.25)'
        }}
      >
        <span style={{ fontSize: 16 }}>+</span> Registrar Cliente Nuevo
      </button>

      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrar()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #00113a 0%, #2552ca 100%)',
                padding: '20px 28px',
                borderRadius: '20px 20px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div>
                <p
                  style={{
                    margin: '0 0 2px',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.2px',
                  }}
                >
                  Registro del Nuevo Cliente
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Cliente de WhatsApp u otro canal
                </p>
              </div>
              <button
                onClick={cerrar}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px 28px 28px', flex: 1 }}>
              {folio ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: 40, margin: '0 0 12px' }}>✅</p>
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#00113a',
                    }}
                  >
                    Lead creado exitosamente
                  </p>
                  <p
                    style={{
                      margin: '0 0 20px',
                      fontSize: 14,
                      color: '#64748b',
                    }}
                  >
                    Se generó el folio de seguimiento:
                  </p>
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 12,
                      padding: '16px 24px',
                      marginBottom: 20,
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#15803d',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Folio asignado
                    </p>
                    <p
                      style={{
                        margin: '0 0 12px',
                        fontSize: 24,
                        fontWeight: 900,
                        color: '#00113a',
                        letterSpacing: '-0.5px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {folio}
                    </p>
                    <a
                      href={`/seguimiento/${folio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2552ca',
                        textDecoration: 'none',
                        background: '#eff6ff',
                        padding: '6px 16px',
                        borderRadius: 8,
                        border: '0.5px solid #bfdbfe',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dbeafe'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#eff6ff'
                      }}
                    >
                      Ver página del cliente →
                    </a>
                  </div>
                  <p
                    style={{
                      margin: '0 0 16px',
                      fontSize: 13,
                      color: '#64748b',
                    }}
                  >
                    Comparte este link con el cliente para que pueda ver su
                    pedido:
                  </p>
                  <CopiarLink folio={folio} />
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'center',
                      marginTop: 20,
                    }}
                  >
                    <button
                      onClick={() => {
                        setFolio(null)
                        setForm({
                          nombre: '',
                          email: '',
                          telefono: '',
                          servicio: '',
                          categoria: 'marketing',
                          estado: 'nuevo',
                          payment_status: 'pendiente',
                          estimated_value: '',
                          mensaje: '',
                        })
                      }}
                      style={{
                        background: '#f8fafc',
                        border: '0.5px solid #e2e8f0',
                        color: '#475569',
                        borderRadius: 8,
                        padding: '9px 20px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                      }}
                    >
                      Crear otro
                    </button>
                    <button
                      onClick={cerrar}
                      style={{
                        background: '#00113a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#0a1f5c'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#00113a'
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {/* Client Name */}
                  <div>
                    <label style={sLabel}>
                      Nombre del cliente <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      name="nombre"
                      type="text"
                      value={form.nombre}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('nombre')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Ej: Juan Pérez"
                      required
                      style={getFieldStyle('nombre')}
                    />
                  </div>

                  {/* Email + Phone Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={sLabel}>
                        Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="cliente@ejemplo.com"
                        required
                        style={getFieldStyle('email')}
                      />
                    </div>
                    <div>
                      <label style={sLabel}>Teléfono / WhatsApp</label>
                      <input
                        name="telefono"
                        type="text"
                        value={form.telefono}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('telefono')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="+593 99 000 0000"
                        style={getFieldStyle('telefono')}
                      />
                    </div>
                  </div>

                  {/* Category + Service Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={sLabel}>
                        Categoría del servicio <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        name="categoria"
                        value={form.categoria}
                        onChange={handleChange}
                        style={{
                          ...getFieldStyle('categoria'),
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: 32,
                        }}
                      >
                        {SERVICIOS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={sLabel}>
                        Descripción del servicio <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        name="servicio"
                        type="text"
                        value={form.servicio}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('servicio')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Ej: 500 tarjetas de presentación, papel couché 300gr"
                        required
                        style={getFieldStyle('servicio')}
                      />
                    </div>
                  </div>

                  {/* Status + Payment Status Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={sLabel}>Estado del lead</label>
                      <select
                        name="estado"
                        value={form.estado}
                        onChange={handleChange}
                        style={{
                          ...getFieldStyle('estado'),
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: 32,
                        }}
                      >
                        {ESTADOS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={sLabel}>Estado de pago</label>
                      <select
                        name="payment_status"
                        value={form.payment_status}
                        onChange={handleChange}
                        style={{
                          ...getFieldStyle('payment_status'),
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: 32,
                        }}
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Estimated Value + Notes Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={sLabel}>Valor estimado ($)</label>
                      <input
                        name="estimated_value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.estimated_value}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('estimated_value')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Ej: 150.00"
                        style={getFieldStyle('estimated_value')}
                      />
                    </div>
                    <div>
                      <label style={sLabel}>Notas internas</label>
                      <input
                        name="mensaje"
                        type="text"
                        value={form.mensaje}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('mensaje')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Detalles, fecha de entrega…"
                        style={getFieldStyle('mensaje')}
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      style={{
                        margin: 0,
                        padding: '10px 14px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#dc2626',
                        fontWeight: 600,
                        animation: 'shake 0.3s ease',
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      justifyContent: 'flex-end',
                      marginTop: 4,
                      paddingTop: 8,
                      borderTop: '0.5px solid #f1f5f9',
                    }}
                  >
                    <button
                      type="button"
                      onClick={cerrar}
                      style={{
                        background: '#f8fafc',
                        border: '0.5px solid #e2e8f0',
                        color: '#475569',
                        borderRadius: 8,
                        padding: '10px 20px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: loading ? '#93c5fd' : '#00113a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.background = '#0a1f5c'
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.background = '#00113a'
                      }}
                    >
                      {loading ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 14,
                              height: 14,
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: '#fff',
                              borderRadius: '50%',
                              animation: 'spin 0.6s linear infinite',
                            }}
                          />
                          Creando…
                        </>
                      ) : (
                        'Crear lead y generar folio'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @media (max-width: 640px) {
          form > div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

function CopiarLink({ folio }: { folio: string }) {
  const [copiado, setCopiado] = useState(false)
  const url = `https://artiaagency.vercel.app/seguimiento/${folio}`

  function copiar() {
    navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: '#f8fafc',
        borderRadius: 10,
        padding: '10px 14px',
        border: '0.5px solid #e2e8f0',
      }}
    >
      <code
        style={{
          flex: 1,
          fontSize: 12,
          color: '#1e293b',
          wordBreak: 'break-all',
          textAlign: 'left',
          fontFamily: 'monospace',
        }}
      >
        {url}
      </code>
      <button
        onClick={copiar}
        style={{
          background: copiado ? '#16a34a' : '#00113a',
          color: '#fff',
          border: 'none',
          borderRadius: 7,
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s',
          minWidth: 70,
        }}
      >
        {copiado ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  )
}