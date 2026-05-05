'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Building2,
  ShoppingBag,
  DollarSign,
  FolderKanban,
  ImageIcon,
  BarChart3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileText,
  ShoppingCart,
  TrendingUp,
  Link2,
  LogOut,
  Globe,
  Search,
  Bell,
  Plus,
  HelpCircle,
} from 'lucide-react'

// ─── NAV STRUCTURE ───────────────────────────────────────────────
type NavLeaf = {
  href: string
  label: string
  icon: React.ReactNode
}

type NavGroup = {
  href?: string
  label: string
  icon: React.ReactNode
  children?: NavLeaf[]
}

const NAV_ITEMS: NavGroup[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: '/admin/leads',
    label: 'Contactos',
    icon: <Users size={18} />,
  },
  {
    href: '/admin/pipeline',
    label: 'Proceso de ventas',
    icon: <GitBranch size={18} />,
  },
  {
    href: '/admin/cliente',
    label: 'Clientes',
    icon: <Building2 size={18} />,
  },
  {
    label: 'Ventas',
    icon: <ShoppingBag size={18} />,
    children: [
      { href: '/admin/landings', label: 'Páginas de venta', icon: <FileText size={15} /> },
      { href: '/admin/landings/orders', label: 'Pedidos', icon: <ShoppingCart size={15} /> },
      { href: '/admin/landings/analytics', label: 'Rendimiento', icon: <TrendingUp size={15} /> },
      { href: '/admin/landings/utm', label: 'Campañas', icon: <Link2 size={15} /> },
    ],
  },
  {
    href: '/admin/finanzas',
    label: 'Ingresos',
    icon: <DollarSign size={18} />,
  },
  {
    href: '/admin/proyectos',
    label: 'Proyectos',
    icon: <FolderKanban size={18} />,
  },
  {
    href: '/admin/imagenes',
    label: 'Archivos',
    icon: <ImageIcon size={18} />,
  },
  {
    href: '/admin/reportes',
    label: 'Reportes',
    icon: <BarChart3 size={18} />,
  },
  {
    href: '/admin/ia',
    label: 'Asistente IA',
    icon: <Sparkles size={18} />,
  },
]
const LOGO_LIGHT = 'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/logo%20artia%20azul.png'
const LOGO_DARK  = 'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png'

// ─── COMPONENT ───────────────────────────────────────────────────
export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const [salesOpen, setSalesOpen] = useState(() =>
    pathname.startsWith('/admin/landings')
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }
  const logo = dark ? LOGO_DARK : LOGO_LIGHT
  const initials = email.slice(0, 2).toUpperCase()
  const username = email.split('@')[0]

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px', gap: 2 }}>
      {/* Logo */}
      <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 18, textDecoration: 'none' }}>
        <img
          src={logo}
          alt="Artia CRM"
          style={{ height: 28, width: 'auto', objectFit: 'contain', maxWidth: 110 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>CRM</span>
      </a>

      {/* Nav Items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          // GROUP WITH CHILDREN (Ventas)
          if (item.children) {
            const groupActive = item.children.some(c => isActive(c.href))
            return (
              <div key={item.label}>
                <button
                  onClick={() => setSalesOpen(!salesOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: groupActive ? '#ede9fe' : 'transparent',
                    color: groupActive ? '#5b21b6' : '#475569',
                    fontWeight: groupActive ? 600 : 500,
                    fontSize: 14,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!groupActive) {
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.color = '#1e293b'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!groupActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#475569'
                    }
                  }}
                >
                  <span style={{ color: groupActive ? '#7c3aed' : '#94a3b8', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ color: '#cbd5e1', transition: 'transform 0.2s', transform: salesOpen ? 'rotate(180deg)' : 'none' }}>
                    <ChevronDown size={14} />
                  </span>
                </button>

                {/* Submenu */}
                {salesOpen && (
                  <div style={{ marginLeft: 20, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {item.children.map(child => {
                      const active = isActive(child.href)
                      return (
                        <a
                          key={child.href}
                          href={child.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            color: active ? '#5b21b6' : '#64748b',
                            background: active ? '#ede9fe' : 'transparent',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            if (!active) {
                              e.currentTarget.style.background = '#f8fafc'
                              e.currentTarget.style.color = '#1e293b'
                            }
                          }}
                          onMouseLeave={e => {
                            if (!active) {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#64748b'
                            }
                          }}
                        >
                          <span style={{ color: active ? '#7c3aed' : '#94a3b8' }}>{child.icon}</span>
                          {child.label}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // REGULAR ITEM
          const active = isActive(item.href!)
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? '#5b21b6' : '#475569',
                background: active ? '#ede9fe' : 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.color = '#1e293b'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#475569'
                }
              }}
            >
              <span style={{ color: active ? '#7c3aed' : '#94a3b8', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '8px 4px' }} />

      {/* User footer */}
      <div style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Artia Studio
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Administrador
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <a
            href="https://artiaagency.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '7px 10px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#cbd5e1'
              e.currentTarget.style.color = '#1e293b'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            <Globe size={13} />
            Sitio
          </a>
          <form action="/api/auth/logout" method="POST" style={{ flex: 1 }}>
            <button
              type="submit"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '7px 10px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fee2e2'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fef2f2'
              }}
            >
              <LogOut size={13} />
              Salir
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className="admin-sidebar-desktop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 220,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          zIndex: 100,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ─── Mobile Header ─── */}
      <header
        className="admin-header-mobile"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          zIndex: 100,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <a href="/admin" style={{ textDecoration: 'none' }}>
          <img src={logo} alt="Artia" style={{ height: 24, width: 'auto', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#475569',
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* ─── Mobile Drawer ─── */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            display: 'flex',
          }}
        >
          <div
            style={{
              width: 260,
              background: '#fff',
              borderRight: '1px solid #e2e8f0',
              overflowY: 'auto',
            }}
            onClick={() => setMobileOpen(false)}
          >
            <SidebarContent />
          </div>
          <div
            style={{ flex: 1, background: 'rgba(15,23,42,0.4)' }}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* ─── Top bar (desktop only, search + actions) ─── */}
      <div
        className="admin-topbar-desktop"
        style={{
          position: 'fixed',
          top: 0,
          left: 220,
          right: 0,
          height: 60,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          gap: 16,
        }}
      >
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '0 14px',
          height: 36,
          flex: '1',
          maxWidth: 320,
        }}>
          <Search size={14} color="#94a3b8" />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Buscar...</span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            padding: 8,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#7c3aed',
              border: '1.5px solid #fff',
            }} />
          </button>
          <button style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            padding: 8,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}>
            <HelpCircle size={18} />
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#7c3aed',
            border: 'none',
            borderRadius: 9,
            padding: '7px 14px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            <Plus size={15} />
            Nuevo
          </button>
        </div>
      </div>

      {/* ─── Spacers ─── */}
      <div className="admin-spacer-desktop" style={{ width: 220, flexShrink: 0 }} />
      <div className="admin-spacer-mobile" style={{ height: 56, display: 'none' }} />

      <style>{`
        @media (max-width: 1024px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-topbar-desktop { display: none !important; }
          .admin-header-mobile { display: flex !important; }
          .admin-spacer-desktop { display: none !important; }
          .admin-spacer-mobile { display: block !important; }
        }
        @media (min-width: 1025px) {
          .admin-sidebar-desktop { display: block !important; }
          .admin-topbar-desktop { display: flex !important; }
          .admin-header-mobile { display: none !important; }
          .admin-spacer-desktop { display: block !important; }
          .admin-spacer-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}
