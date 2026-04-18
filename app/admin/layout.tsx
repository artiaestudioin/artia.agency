import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Artia Studio',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Segunda línea de defensa (el middleware es la primera)
  if (!user) redirect('/admin/login')

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fb' }}>
      {/* Navbar del admin */}
      <nav style={{
        background: '#00113a',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '0.05em',
          }}>
            ARTIA <span style={{ color: '#b3c5ff', fontWeight: 400 }}>Admin</span>
          </span>
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/leads">Leads</NavLink>
          <NavLink href="/admin/emails">Emails</NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(179,197,255,0.6)', fontSize: 12 }}>
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </nav>

      {/* Contenido */}
      <main style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{
      color: 'rgba(179,197,255,0.75)',
      fontSize: 13,
      textDecoration: 'none',
      fontWeight: 500,
      letterSpacing: '0.02em',
    }}>
      {children}
    </a>
  )
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" style={{
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.7)',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        cursor: 'pointer',
      }}>
        Salir
      </button>
    </form>
  )
}
