// app/lp/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LandingRenderer from './LandingRenderer'
import { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const supabase = await createClient()
  const { data: landing } = await supabase
    .from('landings')
    .select('config')
    .eq('slug', params.slug)
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
  params: { slug: string }
  searchParams: { edit?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }
}) {
  const supabase = await createClient()

  // Check for variant assignment (A/B testing)
  let landingQuery = supabase
    .from('landings')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  const { data: landing, error } = await landingQuery

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
    utm_source: searchParams.utm_source || null,
    utm_medium: searchParams.utm_medium || null,
    utm_campaign: searchParams.utm_campaign || null,
  })

  // Increment view counter
  await supabase.rpc('increment_landing_views', { landing_uuid: selectedLanding.id })

  const isEditMode = searchParams.edit === 'true'

  return (
    <LandingRenderer
      landing={selectedLanding}
      isEditMode={isEditMode}
      utmParams={{
        source: searchParams.utm_source,
        medium: searchParams.utm_medium,
        campaign: searchParams.utm_campaign,
      }}
    />
  )
}
