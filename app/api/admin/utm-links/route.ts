import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/admin/utm-links */
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('utm_links')
    .select('*, landing:landing_id(name, slug)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

/** POST /api/admin/utm-links */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, landing_id, slug, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body

    if (!landing_id?.trim() || !utm_source?.trim()) {
      return NextResponse.json({ error: 'Landing y fuente UTM son requeridos' }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre del link es requerido' }, { status: 400 })
    }

    // Build UTM URL from the landing slug
    const landingSlug = slug || ''
    const base = `https://artiaagency.vercel.app/lp/${landingSlug}`
    const params = new URLSearchParams()
    if (utm_source)   params.set('utm_source',   utm_source)
    if (utm_medium)   params.set('utm_medium',   utm_medium)
    if (utm_campaign) params.set('utm_campaign', utm_campaign)
    if (utm_content)  params.set('utm_content',  utm_content)
    if (utm_term)     params.set('utm_term',     utm_term)

    const full_url = `${base}?${params.toString()}`

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('utm_links')
      .insert({
        name: name.trim(),
        landing_id,
        utm_source,
        utm_medium:   utm_medium   || null,
        utm_campaign: utm_campaign || null,
        utm_content:  utm_content  || null,
        utm_term:     utm_term     || null,
        full_url,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}
