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
      <nav style={{ background: '#00113a', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: '-0.3px', marginRight: 10 }}>
            ARTIA <span style={{ color: '#6b8cff', fontWeight: 400 }}>Admin</span>
          </span>
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/leads">Leads</NavLink>
          <NavLink href="/admin/emails">Emails</NavLink>
          <NavLink href="/admin/proyectos">Proyectos</NavLink>
          <NavLink href="/admin/imagenes">Imágenes</NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'rgba(179,197,255,0.5)', fontSize: 11 }}>{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>
              Salir
            </button>
          </form>
        </div>
      </nav>
      <main style={{ padding: '28px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: 'rgba(179,197,255,0.7)', fontSize: 12, textDecoration: 'none', fontWeight: 500, padding: '4px 10px', borderRadius: 6 }}>
      {children}
    </a>
  )
}
