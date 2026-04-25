import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Artia Studio' }

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fb' }}>
      <nav style={{
        background: '#00113a',
        padding: '0 20px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Logo + links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <a href="/admin" style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '-0.3px', marginRight: 14, textDecoration: 'none', flexShrink: 0 }}>
            ARTIA <span style={{ color: '#6b8cff', fontWeight: 400 }}>CRM</span>
          </a>

          {/* Grupo: CRM */}
          <NavGroup label="CRM">
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/leads">Leads</NavLink>
            <NavLink href="/admin/pipeline">Pipeline</NavLink>
            <NavLink href="/admin/cliente">Clientes</NavLink>
          </NavGroup>

          <NavDivider />

          {/* Grupo: Producción */}
          <NavGroup label="Producción">
            <NavLink href="/admin/proyectos">Proyectos</NavLink>
            <NavLink href="/admin/imagenes">Media</NavLink>
          </NavGroup>

          <NavDivider />

          {/* Grupo: Comunicación */}
          <NavGroup label="Comm">
            <NavLink href="/admin/emails">Emails</NavLink>
          </NavGroup>

          <NavDivider />

          {/* Grupo: Control */}
          <NavGroup label="Control">
            <NavLink href="/admin/finanzas">Finanzas</NavLink>
            <NavLink href="/admin/ia">IA</NavLink>
          </NavGroup>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <a href="/client" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'rgba(179,197,255,0.5)', textDecoration: 'none', padding: '4px 10px', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6 }}>
            Portal cliente ↗
          </a>
          <span style={{ color: 'rgba(179,197,255,0.4)', fontSize: 11 }}>{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>
              Salir
            </button>
          </form>
        </div>
      </nav>

      <main style={{ padding: '28px 24px', maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {children}
    </div>
  )
}

function NavDivider() {
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 6px' }} />
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{
      color: 'rgba(179,197,255,0.75)',
      fontSize: 12,
      textDecoration: 'none',
      fontWeight: 500,
      padding: '4px 9px',
      borderRadius: 6,
      whiteSpace: 'nowrap',
      transition: 'all 0.15s',
    }}
      onMouseOver={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
        ;(e.currentTarget as HTMLElement).style.color = '#fff'
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = 'rgba(179,197,255,0.75)'
      }}
    >
      {children}
    </a>
  )
}
