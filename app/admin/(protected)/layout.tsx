import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import AdminNav from './AdminNav'

export const metadata: Metadata = { title: 'Admin — Artia Studio' }

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: 'flex',
      }}
    >
      <AdminNav email={user.email ?? ''} />

      {/* Main content area — offset by sidebar + topbar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Desktop top bar spacer */}
        <div className="admin-topbar-spacer" style={{ height: 60 }} />

        <main
          className="admin-main"
          style={{
            flex: 1,
            padding: '28px 32px',
            maxWidth: 1400,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .admin-topbar-spacer { height: 56px !important; }
          .admin-main { padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  )
}
