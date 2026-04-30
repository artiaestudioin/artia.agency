'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { COLORS } from '@/components/DesignSystem'


type NavItem = {
  href: string
  label: string
  icon: string
  badge?: number
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { href: '/admin', label: 'Dashboard', icon: '◆' },
      { href: '/admin/leads', label: 'Leads', icon: '👤' },
      { href: '/admin/pipeline', label: 'Pipeline', icon: '▦' },
      { href: '/admin/cliente', label: 'Clientes', icon: '◈' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { href: '/admin/proyectos', label: 'Proyectos', icon: '▣' },
      { href: '/admin/imagenes', label: 'Media', icon: '▣' },
      { href: '/admin/emails', label: 'Emails', icon: '✉' },
    ],
  },
  {
  title: 'Finanzas & IA',
  items: [
    { href: '/admin/finanzas', label: 'Finanzas', icon: '$' },
    { href: '/admin/reportes', label: 'Reportes', icon: '📊' },  // ← NUEVO
    { href: '/admin/ia', label: 'IA', icon: '◉' },
  ],
},
]

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Detectar scroll para sombra dinámica
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ─── Desktop Nav ─── */}
      <nav
        className="admin-nav-desktop"
        style={{
          background: COLORS.primary,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.15)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a
            href="/admin"
            style={{
              color: '#fff',
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: '-0.3px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: COLORS.gradientPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              A
            </div>
            <span>
              ARTIA <span style={{ color: '#6b8cff', fontWeight: 400 }}>CRM</span>
            </span>
          </a>

          {/* Links agrupados */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} style={{ display: 'flex', alignItems: 'center' }}>
                {gi > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: 'rgba(255,255,255,0.08)',
                      margin: '0 12px',
                    }}
                  />
                )}
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      style={{
                        color: active ? '#fff' : 'rgba(179,197,255,0.65)',
                        fontSize: 13,
                        textDecoration: 'none',
                        fontWeight: active ? 600 : 500,
                        padding: '6px 12px',
                        borderRadius: 8,
                        whiteSpace: 'nowrap',
                        background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = '#fff'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = 'rgba(179,197,255,0.65)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <span style={{ fontSize: 11, opacity: 0.8 }}>{item.icon}</span>
                      {item.label}
                    </a>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="https://artiaagency.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: 'rgba(179,197,255,0.5)',
              textDecoration: 'none',
              padding: '6px 12px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.color = 'rgba(179,197,255,0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'rgba(179,197,255,0.5)'
            }}
          >
            Ver sitio ↗
          </a>

          <div
            style={{
              width: 1,
              height: 20,
              background: COLORS.gradientPrimary,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {email.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                color: 'rgba(179,197,255,0.6)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {email.split('@')[0]}
            </span>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.65)',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
              }}
            >
              Salir
            </button>
          </form>
        </div>
      </nav>

      {/* ─── Mobile Nav ─── */}
      <nav
        className="admin-nav-mobile"
        style={{
          background: COLORS.primary,
          height: 56,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <a
          href="/admin"
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: 15,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: COLORS.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
            }}
          >
            A
          </div>
          <span>
            ARTIA <span style={{ color: '#6b8cff', fontWeight: 400 }}>CRM</span>
          </span>
        </a>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{mobileOpen ? '✕' : '☰'}</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Menú</span>
        </button>
      </nav>

      {/* ─── Mobile Menu Overlay ─── */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,17,58,0.98)',
            backdropFilter: 'blur(20px)',
            zIndex: 99,
            padding: '20px 16px',
            overflowY: 'auto',
            animation: 'slideIn 0.2s ease',
          }}
        >
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: 'rgba(179,197,255,0.4)',
                  marginBottom: 12,
                  paddingLeft: 4,
                }}
              >
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        borderRadius: 12,
                        textDecoration: 'none',
                        fontSize: 15,
                        fontWeight: active ? 700 : 500,
                        color: active ? '#fff' : 'rgba(179,197,255,0.8)',
                        background: active
                          ? 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))'
                          : 'transparent',
                        border: active
                          ? '1px solid rgba(102,126,234,0.3)'
                          : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: active
                            ? 'linear-gradient(135deg, #667eea, #764ba2)'
                            : 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </a>
                  )
                })}
              </div>
            </div>
          ))}

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: 20,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {email.split('@')[0]}
                </div>
                <div
                  style={{
                    color: 'rgba(179,197,255,0.5)',
                    fontSize: 12,
                  }}
                >
                  {email}
                </div>
              </div>
            </div>

            <a
              href="https://artiaagency.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(179,197,255,0.8)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 12,
              }}
            >
              <span>🌐</span>
              Ver sitio público ↗
            </a>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                style={{
                  width: '100%',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>→</span>
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Spacer para el contenido ─── */}
      <div className="nav-spacer-desktop" style={{ height: 60 }} />
      <div className="nav-spacer-mobile" style={{ height: 56, display: 'none' }} />

      <style>{`
        @media (max-width: 1024px) {
          .admin-nav-desktop { display: none !important; }
          .admin-nav-mobile { display: flex !important; }
          .nav-spacer-desktop { display: none !important; }
          .nav-spacer-mobile { display: block !important; }
        }
        @media (min-width: 1025px) {
          .admin-nav-desktop { display: flex !important; }
          .admin-nav-mobile { display: none !important; }
          .nav-spacer-desktop { display: block !important; }
          .nav-spacer-mobile { display: none !important; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}