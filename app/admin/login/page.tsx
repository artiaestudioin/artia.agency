'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #00113a 0%, #001f6b 100%)',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 380,
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          background: '#2552ca',
          padding: '28px 32px',
          textAlign: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png"
            alt="Artia Studio"
            style={{ height: 36, margin: '0 auto 8px', display: 'block' }}
          />
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Panel de Administración
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{
                width: '100%',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                color: '#1e293b',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                color: '#1e293b',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{
              margin: 0,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: 13,
              color: '#dc2626',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#93c5fd' : '#00113a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '13px',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Verificando...' : 'Entrar al Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
