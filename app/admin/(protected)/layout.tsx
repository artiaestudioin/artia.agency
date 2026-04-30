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
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <AdminNav email={user.email ?? ''} />
      <main className="admin-main" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .admin-main { padding: 16px !important; }
        }
      `}</style>
    </div>
  )
}
