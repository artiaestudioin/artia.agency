import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/admin/utm-links */
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('utm_links')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

/** POST /api/admin/utm-links */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, original_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body

    if (!original_url?.trim() || !utm_campaign?.trim()) {
      return NextResponse.json({ error: 'URL y campaña son requeridos' }, { status: 400 })
    }

    // Build UTM URL
    const url = new URL(original_url)
    if (utm_source)   url.searchParams.set('utm_source',   utm_source)
    if (utm_medium)   url.searchParams.set('utm_medium',   utm_medium)
    if (utm_campaign) url.searchParams.set('utm_campaign', utm_campaign)
    if (utm_content)  url.searchParams.set('utm_content',  utm_content)
    if (utm_term)     url.searchParams.set('utm_term',     utm_term)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('utm_links')
      .insert({
        name: name?.trim() || null, original_url: original_url.trim(),
        utm_source: utm_source || null, utm_medium: utm_medium || null,
        utm_campaign: utm_campaign.trim(), utm_content: utm_content || null,
        utm_term: utm_term || null, full_url: url.toString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}
