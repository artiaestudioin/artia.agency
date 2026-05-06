'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  GitBranch,
  ShoppingBag,
  DollarSign,
  FolderKanban,
  ImageIcon,
  BarChart3,
  Sparkles,
  ChevronDown,
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
  MailOpen,
  UserCircle,
  Sun,
  Moon,
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
    label: 'Resumen',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Clientes',
    icon: <Users size={18} />,
    children: [
      { href: '/admin/leads', label: 'Clientes Actuales', icon: <UserCircle size={15} /> },
      { href: '/admin/pipeline', label: 'Estado de Clientes', icon: <GitBranch size={15} /> },
    ],
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
    label: 'Sistema Contable',
    icon: <DollarSign size={18} />,
  },
  {
    href: '/admin/proyectos',
    label: 'Proyectos',
    icon: <FolderKanban size={18} />,
  },
  {
    href: '/admin/emails',
    label: 'Email',
    icon: <MailOpen size={18} />,
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
  {
    href: '/admin/imagenes',
    label: 'Media-fotos',
    icon: <ImageIcon size={18} />,
  },
]

const LOGO_LIGHT = 'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/logo%20artia%20azul.png'
const LOGO_DARK  = 'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png'

// ─── THEME TOKENS ────────────────────────────────────────────────
function getTheme(dark: boolean) {
  if (dark) return {
    // Fondos
    sidebar:      '#0f1117',
    sidebarBorder:'#1e2433',
    topbar:       '#0f1117',
    topbarBorder: '#1e2433',
    mobileHeader: '#0f1117',
    // Texto
    textPrimary:  '#f1f5f9',
    textSecondary:'#94a3b8',
    textMuted:    '#475569',
    // Items nav
    itemBg:       'transparent',
    itemColor:    '#94a3b8',
    itemHoverBg:  '#1e2433',
    itemHoverColor:'#e2e8f0',
    itemActiveBg: '#2d1f5e',
    itemActiveColor:'#a78bfa',
    itemActiveIcon:'#7c3aed',
    // Grupo/submenu
    groupActiveBg:   '#2d1f5e',
    groupActiveColor:'#a78bfa',
    subActiveBg:     '#2d1f5e',
    subActiveColor:  '#a78bfa',
    subActiveIcon:   '#7c3aed',
    // Búsqueda
    searchBg:     '#1a1f2e',
    searchBorder: '#2d3748',
    // Divider
    divider:      '#1e2433',
    // Avatar
    avatarText:   '#fff',
    // Botón sitio
    siteBg:       '#1a1f2e',
    siteBorder:   '#2d3748',
    siteColor:    '#94a3b8',
    siteHoverBorder:'#475569',
    siteHoverColor: '#e2e8f0',
    // Botón salir
    logoutBg:     '#2d1515',
    logoutBorder: '#7f1d1d',
    logoutColor:  '#f87171',
    logoutHoverBg:'#3f1515',
    // Toggle
    toggleBg:     '#1e2433',
    toggleColor:  '#94a3b8',
    // Mobile hamburger
    hamburgerBg:  '#1a1f2e',
    hamburgerBorder:'#2d3748',
    hamburgerColor:'#94a3b8',
    // Bell badge border
    badgeBorder:  '#0f1117',
  }

  return {
    // Fondos
    sidebar:      '#ffffff',
    sidebarBorder:'#e2e8f0',
    topbar:       '#ffffff',
    topbarBorder: '#e2e8f0',
    mobileHeader: '#ffffff',
    // Texto
    textPrimary:  '#0f172a',
    textSecondary:'#475569',
    textMuted:    '#94a3b8',
    // Items nav
    itemBg:       'transparent',
    itemColor:    '#475569',
    itemHoverBg:  '#f8fafc',
    itemHoverColor:'#1e293b',
    itemActiveBg: '#ede9fe',
    itemActiveColor:'#5b21b6',
    itemActiveIcon:'#7c3aed',
    // Grupo/submenu
    groupActiveBg:   '#ede9fe',
    groupActiveColor:'#5b21b6',
    subActiveBg:     '#ede9fe',
    subActiveColor:  '#5b21b6',
    subActiveIcon:   '#7c3aed',
    // Búsqueda
    searchBg:     '#f8fafc',
    searchBorder: '#e2e8f0',
    // Divider
    divider:      '#f1f5f9',
    // Avatar
    avatarText:   '#fff',
    // Botón sitio
    siteBg:       '#f8fafc',
    siteBorder:   '#e2e8f0',
    siteColor:    '#64748b',
    siteHoverBorder:'#cbd5e1',
    siteHoverColor: '#1e293b',
    // Botón salir
    logoutBg:     '#fef2f2',
    logoutBorder: '#fecaca',
    logoutColor:  '#ef4444',
    logoutHoverBg:'#fee2e2',
    // Toggle
    toggleBg:     '#f1f5f9',
    toggleColor:  '#64748b',
    // Mobile hamburger
    hamburgerBg:  '#f8fafc',
    hamburgerBorder:'#e2e8f0',
    hamburgerColor:'#475569',
    // Bell badge border
    badgeBorder:  '#ffffff',
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────
export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const [salesOpen, setSalesOpen] = useState(() => pathname.startsWith('/admin/landings'))
  const [clientesOpen, setClientesOpen] = useState(() => pathname.startsWith('/admin/leads') || pathname.startsWith('/admin/pipeline'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [logoError, setLogoError] = useState(false)

  // Inicializar: leer preferencia guardada o sistema
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('artia-theme')
    if (saved === 'dark') {
      setDark(true)
    } else if (saved === 'light') {
      setDark(false)
    } else {
      // Sin preferencia guardada: usar sistema
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  // Escuchar cambios del sistema (solo si no hay preferencia guardada)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('artia-theme')) {
        setDark(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => { setLogoError(false) }, [dark])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('artia-theme', next ? 'dark' : 'light')
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const t = getTheme(dark)
  const logo = dark ? LOGO_DARK : LOGO_LIGHT
  const initials = email.slice(0, 2).toUpperCase()

  // Evitar flash antes de montar
  if (!mounted) return null

  const LogoBlock = ({ height = 28 }: { height?: number }) => (
    <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
      {!logoError ? (
        <img
          src={logo}
          alt="Artia CRM"
          style={{ height, width: 'auto', objectFit: 'contain', maxWidth: 110, display: 'block' }}
          onError={() => setLogoError(true)}
        />
      ) : (
        <span style={{
          fontSize: height > 24 ? 20 : 16,
          fontWeight: 800,
          color: dark ? '#a78bfa' : '#1e3a8a',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}>
          ARTIA
        </span>
      )}
      <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
        CRM
      </span>
    </a>
  )

  const NavItem = ({ item }: { item: NavGroup }) => {
    // GRUPO CON HIJOS
    if (item.children) {
      const isVentas = item.label === 'Ventas'
      const open = isVentas ? salesOpen : clientesOpen
      const setOpen = isVentas ? setSalesOpen : setClientesOpen
      const groupActive = item.children.some(c => isActive(c.href))

      return (
        <div>
          <button
            onClick={() => setOpen(!open)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: groupActive ? t.groupActiveBg : t.itemBg,
              color: groupActive ? t.groupActiveColor : t.itemColor,
              fontWeight: groupActive ? 600 : 500,
              fontSize: 14,
              textAlign: 'left',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              if (!groupActive) {
                e.currentTarget.style.background = t.itemHoverBg
                e.currentTarget.style.color = t.itemHoverColor
              }
            }}
            onMouseLeave={e => {
              if (!groupActive) {
                e.currentTarget.style.background = t.itemBg
                e.currentTarget.style.color = t.itemColor
              }
            }}
          >
            <span style={{ color: groupActive ? t.itemActiveIcon : t.textMuted, flexShrink: 0 }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{
              color: t.textMuted,
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'none',
              display: 'flex',
            }}>
              <ChevronDown size={14} />
            </span>
          </button>

          {open && (
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
                      color: active ? t.subActiveColor : t.itemColor,
                      background: active ? t.subActiveBg : 'transparent',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = t.itemHoverBg
                        e.currentTarget.style.color = t.itemHoverColor
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = t.itemColor
                      }
                    }}
                  >
                    <span style={{ color: active ? t.subActiveIcon : t.textMuted }}>{child.icon}</span>
                    {child.label}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // ITEM SIMPLE
    const active = isActive(item.href!)
    return (
      <a
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
          color: active ? t.itemActiveColor : t.itemColor,
          background: active ? t.itemActiveBg : t.itemBg,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = t.itemHoverBg
            e.currentTarget.style.color = t.itemHoverColor
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = t.itemBg
            e.currentTarget.style.color = t.itemColor
          }
        }}
      >
        <span style={{ color: active ? t.itemActiveIcon : t.textMuted, flexShrink: 0 }}>
          {item.icon}
        </span>
        {item.label}
      </a>
    )
  }

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px', gap: 2 }}>
      {/* Logo + toggle */}
      <div style={{ padding: '8px 10px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <LogoBlock height={28} />
        <button
          onClick={toggleDark}
          title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          style={{
            background: t.toggleBg,
            border: 'none',
            borderRadius: 8,
            padding: '5px 7px',
            cursor: 'pointer',
            color: t.toggleColor,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.label} item={item} />
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: t.divider, margin: '8px 4px' }} />

      {/* User footer */}
      <div style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Artia Studio
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 5, padding: '7px 10px', borderRadius: 8,
              background: t.siteBg, border: `1px solid ${t.siteBorder}`,
              color: t.siteColor, fontSize: 12, fontWeight: 500,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = t.siteHoverBorder
              e.currentTarget.style.color = t.siteHoverColor
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = t.siteBorder
              e.currentTarget.style.color = t.siteColor
            }}
          >
            <Globe size={13} />
            Sitio
          </a>
          <form action="/api/auth/logout" method="POST" style={{ flex: 1 }}>
            <button
              type="submit"
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 5, padding: '7px 10px',
                borderRadius: 8, background: t.logoutBg,
                border: `1px solid ${t.logoutBorder}`, color: t.logoutColor,
                fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = t.logoutHoverBg }}
              onMouseLeave={e => { e.currentTarget.style.background = t.logoutBg }}
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
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
          background: t.sidebar,
          borderRight: `1px solid ${t.sidebarBorder}`,
          zIndex: 100, overflowY: 'auto', overflowX: 'hidden',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ─── Mobile Header ─── */}
      <header
        className="admin-header-mobile"
        style={{
          display: 'none', position: 'fixed', top: 0, left: 0, right: 0,
          height: 56, background: t.mobileHeader,
          borderBottom: `1px solid ${t.sidebarBorder}`,
          zIndex: 100, alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          transition: 'background 0.2s',
        }}
      >
        <LogoBlock height={24} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={toggleDark}
            style={{
              background: t.toggleBg, border: 'none', borderRadius: 8,
              padding: '6px 8px', cursor: 'pointer', color: t.toggleColor,
              display: 'flex', alignItems: 'center',
            }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: t.hamburgerBg,
              border: `1px solid ${t.hamburgerBorder}`,
              borderRadius: 8, padding: '6px 12px',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: t.hamburgerColor,
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* ─── Mobile Drawer ─── */}
      {mobileOpen && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, zIndex: 99, display: 'flex' }}>
          <div
            style={{
              width: 260, background: t.sidebar,
              borderRight: `1px solid ${t.sidebarBorder}`,
              overflowY: 'auto',
            }}
            onClick={() => setMobileOpen(false)}
          >
            <SidebarContent />
          </div>
          <div
            style={{ flex: 1, background: 'rgba(15,23,42,0.5)' }}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* ─── Topbar (desktop) ─── */}
      <div
        className="admin-topbar-desktop"
        style={{
          position: 'fixed', top: 0, left: 220, right: 0, height: 60,
          background: t.topbar,
          borderBottom: `1px solid ${t.topbarBorder}`,
          zIndex: 90, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 28px', gap: 16,
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: t.searchBg, border: `1px solid ${t.searchBorder}`,
          borderRadius: 10, padding: '0 14px', height: 36,
          flex: '1', maxWidth: 320,
        }}>
          <Search size={14} color={t.textMuted} />
          <span style={{ fontSize: 13, color: t.textMuted }}>Buscar...</span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Toggle dark */}
          <button
            onClick={toggleDark}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
            style={{
              background: t.toggleBg, border: 'none', borderRadius: 8,
              padding: 8, cursor: 'pointer', color: t.toggleColor,
              display: 'flex', alignItems: 'center', transition: 'background 0.15s',
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Bell */}
          <button style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderRadius: 8, padding: 8, color: t.textSecondary,
            display: 'flex', alignItems: 'center', position: 'relative',
          }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: 5, right: 5,
              width: 8, height: 8, borderRadius: '50%',
              background: '#7c3aed', border: `1.5px solid ${t.badgeBorder}`,
            }} />
          </button>

          {/* Help */}
          <button style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderRadius: 8, padding: 8, color: t.textSecondary,
            display: 'flex', alignItems: 'center',
          }}>
            <HelpCircle size={18} />
          </button>

          {/* Nuevo */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#7c3aed', border: 'none', borderRadius: 9,
            padding: '7px 14px', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
          .admin-topbar-desktop  { display: none !important; }
          .admin-header-mobile   { display: flex !important; }
          .admin-spacer-desktop  { display: none !important; }
          .admin-spacer-mobile   { display: block !important; }
        }
        @media (min-width: 1025px) {
          .admin-sidebar-desktop { display: block !important; }
          .admin-topbar-desktop  { display: flex !important; }
          .admin-header-mobile   { display: none !important; }
          .admin-spacer-desktop  { display: block !important; }
          .admin-spacer-mobile   { display: none !important; }
        }
      `}</style>
    </>
  )
}