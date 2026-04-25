'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientAccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) return
    if (!/^ASMK-[A-Z0-9]{4}-[0-9]{4}$/.test(clean)) {
      setError('Formato inválido. Ejemplo: ASMK-AB3D-1234')
      return
    }
    router.push(`/client/${clean}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#00113a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: 24 }}>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" height="40" style={{ height: 40, width: 'auto', marginBottom: 20 }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Portal de clientes
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Ingresa tu código de acceso para ver tu proyecto
        </p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '36px 40px', width: '100%', maxWidth: 380 }}>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
            Código de acceso
          </label>
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="ASMK-XXXX-0000"
            maxLength={14}
            style={{
              display: 'block', width: '100%', padding: '14px 16px',
              background: 'rgba(255,255,255,0.08)', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 10, fontSize: 18, fontWeight: 800, color: '#fff',
              letterSpacing: '3px', fontFamily: 'monospace', outline: 'none',
              boxSizing: 'border-box', textAlign: 'center',
            }}
          />
          {error && (
            <p style={{ fontSize: 12, color: '#f87171', margin: '8px 0 0', textAlign: 'center' }}>{error}</p>
          )}
          <button type="submit" style={{
            display: 'block', width: '100%', marginTop: 20,
            background: '#2552ca', color: '#fff', border: 'none',
            borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 800,
            letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Acceder →
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }}>
          ¿No tienes un código? Contáctanos por{' '}
          <a href="https://wa.me/593969937265" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 700 }}>
            WhatsApp
          </a>
        </p>
      </div>
    </div>
  )
}
