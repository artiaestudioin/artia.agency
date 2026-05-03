// app/lp/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LandingRenderer from './LandingRenderer'
import { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: landing } = await supabase
    .from('landings')
    .select('config')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!landing) {
    return { title: 'Página no encontrada' }
  }

  const config = landing.config
  return {
    title: config.meta_title || config.headline,
    description: config.meta_description || config.subheadline,
    openGraph: {
      images: config.meta_image ? [config.meta_image] : [config.image],
    },
  }
}

export async function generateStaticParams() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('landings')
    .select('slug')
    .eq('status', 'active')

  return (data || []).map((l) => ({ slug: l.slug }))
}

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ edit?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: landing, error } = await supabase
    .from('landings')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !landing) {
    notFound()
  }

  // If parent landing, check for variants
  let selectedLanding = landing
  if (!landing.is_variant && landing.parent_id === null) {
    const { data: variants } = await supabase
      .from('landings')
      .select('*')
      .eq('parent_id', landing.id)
      .eq('status', 'active')

    if (variants && variants.length > 0) {
      // Simple traffic split
      const random = Math.random() * 100
      let cumulative = 0
      for (const variant of variants) {
        cumulative += variant.traffic_split
        if (random <= cumulative) {
          selectedLanding = variant
          break
        }
      }
    }
  }

  // Track page view
  await supabase.from('landing_events').insert({
    landing_id: selectedLanding.id,
    event_type: 'page_view',
    utm_source: sp.utm_source || null,
    utm_medium: sp.utm_medium || null,
    utm_campaign: sp.utm_campaign || null,
  })

  // Increment view counter
  await supabase.rpc('increment_landing_views', { landing_uuid: selectedLanding.id })

  const isEditMode = sp.edit === 'true'

  return (
    <LandingRenderer
      landing={selectedLanding}
      isEditMode={isEditMode}
      utmParams={{
        source: sp.utm_source,
        medium: sp.utm_medium,
        campaign: sp.utm_campaign,
      }}
    />
  )
}