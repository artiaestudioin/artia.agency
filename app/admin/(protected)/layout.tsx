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
      className="admin-shell"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <AdminNav email={user.email ?? ''} />

      {/* Main content area — offset by sidebar + topbar */}
      <div className="admin-content-area">
        {/* Top bar height spacer */}
        <div className="admin-spacer-topbar" />
        <div className="admin-spacer-mobile" style={{ display: 'none' }} />

        <main className="admin-main-content">
          {children}
        </main>
      </div>

      <style>{`
        /* Ensure spacers are correct in layout context */
        @media (max-width: 1024px) {
          .admin-content-area .admin-spacer-topbar { display: none !important; }
          .admin-content-area .admin-spacer-mobile { display: block !important; }
        }
        @media (min-width: 1025px) {
          .admin-content-area .admin-spacer-topbar { display: block !important; }
          .admin-content-area .admin-spacer-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}
