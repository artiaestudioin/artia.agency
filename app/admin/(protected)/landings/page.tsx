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

  // Get landings with real revenue from orders
  let landingsQuery = supabase
    .from('landings')
    .select('id, name, slug, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    landingsQuery = landingsQuery.eq('status', status)
  }

  const { data: landingsRaw } = await landingsQuery

  // Get real revenue per landing from delivered & paid orders
  const landingIds = (landingsRaw || []).map(l => l.id)
  let revenueMap: Record<string, number> = {}

  if (landingIds.length > 0) {
    const { data: ordersRevenue } = await supabase
      .from('landing_orders')
      .select('landing_id, total')
      .in('landing_id', landingIds)
      .eq('status', 'delivered')
      .eq('payment_status', 'paid')

    revenueMap = (ordersRevenue || []).reduce((acc: Record<string, number>, o) => {
      acc[o.landing_id] = (acc[o.landing_id] || 0) + (o.total || 0)
      return acc
    }, {})
  }

  // Merge landings with real revenue
  const landings = (landingsRaw || []).map(l => ({
    ...l,
    revenue_total: revenueMap[l.id] || 0,
    views_count: 0,
    conversions_count: 0,
    clicks_count: 0,
    conversion_rate: 0,
    ctr: 0,
    total_orders: 0,
    pending_orders: 0,
    paid_orders: 0,
  })) as unknown as LandingStats[]

  // Filter by search (client-side sobre los resultados)
  const filtered = (landings || []).filter((l) => {
    if (!q) return true
    const term = q.toLowerCase()
    return l.name?.toLowerCase().includes(term) || l.slug?.toLowerCase().includes(term)
  })

  // Counts sobre la data completa (antes de filtrar por búsqueda)
  const counts = {
    all: landings?.length || 0,
    active: landings?.filter((l) => l.status === 'active').length || 0,
    draft: landings?.filter((l) => l.status === 'draft').length || 0,
    paused: landings?.filter((l) => l.status === 'paused').length || 0,
    archived: landings?.filter((l) => l.status === 'archived').length || 0,
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