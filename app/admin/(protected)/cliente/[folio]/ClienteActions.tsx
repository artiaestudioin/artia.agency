'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ESTADOS = [
  { value: 'nuevo',      label: '📩 Nuevo',       color: '#2563eb' },
  { value: 'contactado', label: '🔍 Contactado',   color: '#ca8a04' },
  { value: 'en_proceso', label: '⚙️ En proceso',   color: '#16a34a' },
  { value: 'cerrado',    label: '✅ Cerrado',       color: '#15803d' },
  { value: 'perdido',    label: '❌ Perdido',       color: '#dc2626' },
]

export default function ClienteActions({
  folio,
  estadoActual,
  tieneEmail,
  notasActuales,
}: {
  folio: string
  estadoActual: string
  tieneEmail: boolean
  notasActuales: string
}) {
  const router = useRouter()
  const [estado, setEstado]       = useState(estadoActual)
  const [notas, setNotas]         = useState(notasActuales)
  const [mensaje, setMensaje]     = useState('')
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando]   = useState(false)
  const [copiado, setCopiado]     = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  // URL pública — no requiere login
  const linkPublico = `https://artiaagency.vercel.app/seguimiento/${folio}`

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkPublico)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function guardarEstado() {
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/lead-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folio, estado, notas_internas: notas }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('Estado actualizado correctamente', true)
        router.refresh()
      } else {
        showToast(data.error ?? 'Error al guardar', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      setGuardando(false)
    }
  }

  async function notificarCliente() {
    setEnviando(true)
    try {
      const res = await fetch('/api/admin/notificar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folio, mensaje_personalizado: mensaje }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('Email enviado al cliente ✓', true)
        setMensaje('')
      } else {
        showToast(data.error ?? 'Error al enviar', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Link público de seguimiento */}
      <div style={{
        background: '#f0fdf4', borderRadius: 12,
        border: '1px solid #bbf7d0', padding: '16px 20px', marginBottom: 16,
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🔗 Link público de seguimiento
        </p>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#16a34a' }}>
          El cliente puede ver su pedido sin necesidad de contraseña.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{
            flex: 1, fontSize: 12, color: '#1e293b', background: '#fff',
            border: '0.5px solid #bbf7d0', borderRadius: 6,
            padding: '8px 12px', wordBreak: 'break-all',
          }}>
            {linkPublico}
          </code>
          <button
            onClick={copiarLink}
            style={{
              background: copiado ? '#16a34a' : '#00113a',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
          <a
            href={linkPublico}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#f8fafc', color: '#2552ca',
              border: '0.5px solid #bfdbfe', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontWeight: 700,
              textDecoration: 'none', flexShrink: 0,
            }}
          >
            Ver →
          </a>
        </div>
      </div>
    </>
  )
}
