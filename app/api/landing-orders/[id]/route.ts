// app/api/landing-orders/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const body = await request.json()

  // Get current order for timeline
  const { data: current } = await supabase
    .from('landing_orders')
    .select('timeline, status')
    .eq('id', params.id)
    .single()

  const timeline = current?.timeline || []

  // Add new timeline entry if status changed
  if (body.status && body.status !== current?.status) {
    timeline.push({
      status: body.status,
      date: new Date().toISOString(),
      note: body.timeline_note || `Estado actualizado a ${body.status}`,
      updated_by: body.updated_by || 'system',
    })
    body.timeline = timeline
  }

  const { data, error } = await supabase
    .from('landing_orders')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ order: data })
}
