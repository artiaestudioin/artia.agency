import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import AdminNav from './AdminNav'

export const metadata: Metadata = { title: 'Admin — Artia Studio' }

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: '#f1f5f9',
      }}
    >
      {/* Sidebar + topbar + mobile header — rendered by AdminNav */}
      <AdminNav email={user.email ?? ''} />

      {/* Right side: spacer column (220px on desktop, 0 on mobile) + content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Push content below topbar on desktop / mobile header on mobile */}
        <div className="artia-topbar-spacer" />

        <main
          style={{
            flex: 1,
            padding: '32px',
            maxWidth: 1440,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
          className="artia-main-pad"
        >
          {children}
        </main>
      </div>

      <style>{`
        /* ── Sidebar spacer ── */
        /* Handled by AdminNav rendering a sibling spacer div */

        /* ── Topbar spacer ── */
        .artia-topbar-spacer {
          height: 60px;   /* matches topbar height */
          flex-shrink: 0;
        }

        /* On mobile: topbar disappears, mobile header takes 56px */
        @media (max-width: 1024px) {
          .artia-topbar-spacer { height: 56px; }
          .artia-main-pad { padding: 20px 16px !important; }
        }
        @media (max-width: 640px) {
          .artia-main-pad { padding: 14px 12px !important; }
        }
      `}</style>
    </div>
  )
}
