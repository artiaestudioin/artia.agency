'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SERVICIOS = [
  { label: 'Marketing Digital / Redes Sociales', value: 'marketing' },
  { label: 'Impresión / Papelería',              value: 'impresion' },
  { label: 'Fotografía / Video / Drone',         value: 'fotografia' },
  { label: 'Branding / Diseño Gráfico',          value: 'branding' },
  { label: 'Página Web / Landing',               value: 'web' },
  { label: 'Otro',                               value: 'otro' },
]

export default function NuevoLeadModal() {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [folio, setFolio]     = useState<string | null>(null)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    nombre:    '',
    email:     '',
    telefono:  '',
    servicio:  '',
    categoria: 'marketing',
    mensaje:   '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    // Si cambia el servicio preestablecido, actualizar categoría automáticamente
    if (name === 'categoria') setForm(prev => ({ ...prev, categoria: value, servicio: SERVICIOS.find(s => s.value === value)?.label ?? '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.servicio.trim()) {
      setError('Nombre y servicio son obligatorios.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/lead-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error al crear el lead.')
        return
      }
      setFolio(data.folio)
      router.refresh()
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  function cerrar() {
    setOpen(false)
    setFolio(null)
    setError('')
    setForm({ nombre: '', email: '', telefono: '', servicio: '', categoria: 'marketing', mensaje: '' })
  }

  return (
    <>
      {/* Botón abrir */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#2552ca', color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 20px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.3px',
        }}
      >
        <span style={{ fontSize: 16 }}>+</span> Nuevo lead manual
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) cerrar() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Header modal */}
            <div style={{
              background: 'linear-gradient(135deg, #00113a 0%, #2552ca 100%)',
              padding: '20px 28px', borderRadius: '20px 20px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                  Nuevo lead manual
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  Cliente de WhatsApp u otro canal
                </p>
              </div>
              <button onClick={cerrar} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 32, height: 32, fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div style={{ padding: '24px 28px 28px' }}>

              {/* Estado: folio creado */}
              {folio ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: 40, margin: '0 0 12px' }}>✅</p>
                  <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#00113a' }}>
                    Lead creado exitosamente
                  </p>
                  <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
                    Se generó el folio de seguimiento:
                  </p>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 12, padding: '16px 24px', marginBottom: 20,
                  }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Folio asignado
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 900, color: '#00113a', letterSpacing: '-0.5px' }}>
                      {folio}
                    </p>
                    <a
                      href={`/seguimiento/${folio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', fontSize: 12, fontWeight: 700,
                        color: '#2552ca', textDecoration: 'none',
                        background: '#eff6ff', padding: '6px 16px',
                        borderRadius: 8, border: '0.5px solid #bfdbfe',
                      }}
                    >
                      Ver página del cliente →
                    </a>
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
                    Comparte este link con el cliente para que pueda ver su pedido:
                  </p>
                  <CopiarLink folio={folio} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                    <button
                      onClick={() => { setFolio(null); setForm({ nombre: '', email: '', telefono: '', servicio: '', categoria: 'marketing', mensaje: '' }) }}
                      style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', color: '#475569', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Crear otro
                    </button>
                    <button
                      onClick={cerrar}
                      style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario */
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Nombre */}
                  <Field label="Nombre del cliente *">
                    <input
                      name="nombre" type="text" value={form.nombre}
                      onChange={handleChange} placeholder="Ej: Juan Pérez" required
                    />
                  </Field>

                  {/* Email + Teléfono en fila */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Email">
                      <input
                        name="email" type="email" value={form.email}
                        onChange={handleChange} placeholder="cliente@ejemplo.com"
                      />
                    </Field>
                    <Field label="Teléfono / WhatsApp">
                      <input
                        name="telefono" type="text" value={form.telefono}
                        onChange={handleChange} placeholder="+593 99 000 0000"
                      />
                    </Field>
                  </div>

                  {/* Categoría (para el prefijo del folio) */}
                  <Field label="Categoría del servicio *">
                    <select name="categoria" value={form.categoria} onChange={handleChange}>
                      {SERVICIOS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>

                  {/* Servicio personalizado */}
                  <Field label="Descripción del servicio solicitado *">
                    <input
                      name="servicio" type="text" value={form.servicio}
                      onChange={handleChange}
                      placeholder="Ej: 500 tarjetas de presentación, papel couché 300gr"
                      required
                    />
                  </Field>

                  {/* Mensaje / notas */}
                  <Field label="Notas del pedido">
                    <textarea
                      name="mensaje" value={form.mensaje}
                      onChange={handleChange}
                      placeholder="Detalles adicionales, especificaciones, fecha de entrega requerida…"
                      rows={3}
                    />
                  </Field>

                  {error && (
                    <p style={{
                      margin: 0, padding: '10px 14px',
                      background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: 8, fontSize: 13, color: '#dc2626',
                    }}>
                      {error}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button type="button" onClick={cerrar} style={{
                      background: '#f8fafc', border: '0.5px solid #e2e8f0', color: '#475569',
                      borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={loading} style={{
                      background: loading ? '#93c5fd' : '#00113a', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '10px 24px',
                      fontSize: 13, fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}>
                      {loading ? 'Creando…' : 'Crear lead y generar folio'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: '#94a3b8', textTransform: 'uppercase',
        letterSpacing: '1px', marginBottom: 6,
      }}>
        {label}
      </label>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '0.5px solid #e2e8f0' }}>
      <code style={{ flex: 1, fontSize: 12, color: '#1e293b', wordBreak: 'break-all', textAlign: 'left' }}>
        {url}
      </code>
      <button onClick={copiar} style={{
        background: copiado ? '#16a34a' : '#00113a', color: '#fff',
        border: 'none', borderRadius: 7, padding: '7px 14px',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        flexShrink: 0, transition: 'background 0.2s',
      }}>
        {copiado ? '✓' : 'Copiar'}
      </button>
    </div>
  )
}
