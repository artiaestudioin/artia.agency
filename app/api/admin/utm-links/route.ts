// app/api/admin/utm-links/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const landing_id = searchParams.get('landing_id')

  const supabase = await createClient()

  let query = supabase.from('utm_links').select('*')
  if (landing_id) query = query.eq('landing_id', landing_id)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ links: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Build full URL
  const baseUrl = `https://artiaagency.vercel.app/lp/${body.slug}`
  const params = new URLSearchParams()
  if (body.utm_source) params.set('utm_source', body.utm_source)
  if (body.utm_medium) params.set('utm_medium', body.utm_medium)
  if (body.utm_campaign) params.set('utm_campaign', body.utm_campaign)
  if (body.utm_content) params.set('utm_content', body.utm_content)
  if (body.utm_term) params.set('utm_term', body.utm_term)

  const full_url = `${baseUrl}?${params.toString()}`

  const { data, error } = await supabase
    .from('utm_links')
    .insert({ ...body, full_url })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ link: data }, { status: 201 })
}
