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
    <div style={{ minHeight: '100vh', background: '#f7f9fb' }}>
      <AdminNav email={user.email ?? ''} />
      <main style={{ padding: '28px 24px', maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
