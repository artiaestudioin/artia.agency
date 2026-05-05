// app/admin/(protected)/landings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { LandingStats } from '@/types/landing'
import LandingsPageClient from './LandingsPageClient'

export const metadata = { title: 'Landing Pages — Artia Admin' }

export default async function LandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  // Get stats from view
  let query = supabase.from('landing_stats').select('*').order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: landings } = await query

  // Filter by search (client-side sobre los resultados)
  const filtered = (landings || []).filter((l: LandingStats) => {
    if (!q) return true
    const term = q.toLowerCase()
    return l.name?.toLowerCase().includes(term) || l.slug?.toLowerCase().includes(term)
  })

  // Counts sobre la data completa (antes de filtrar por búsqueda)
  const counts = {
    all: landings?.length || 0,
    active: landings?.filter((l: LandingStats) => l.status === 'active').length || 0,
    draft: landings?.filter((l: LandingStats) => l.status === 'draft').length || 0,
    paused: landings?.filter((l: LandingStats) => l.status === 'paused').length || 0,
    archived: landings?.filter((l: LandingStats) => l.status === 'archived').length || 0,
  }

  return (
    <LandingsPageClient
      landings={filtered}
      counts={counts}
      status={status}
      q={q}
    />
  )
}