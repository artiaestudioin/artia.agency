// app/api/landing-events/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Insert event
  const { data, error } = await supabase
    .from('landing_events')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update counters if needed
  if (body.event_type === 'page_view' && body.landing_id) {
    await supabase.rpc('increment_landing_views', { landing_uuid: body.landing_id })
  }

  return NextResponse.json({ event: data }, { status: 201 })
}
