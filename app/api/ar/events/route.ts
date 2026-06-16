import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/ar/events  → registrar evento de analytics (público)
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  let body: { experience_id: string; event_type: 'scan' | 'page_view' | 'ar_launch' | 'share' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.experience_id || !body.event_type) {
    return NextResponse.json({ error: 'experience_id y event_type son requeridos' }, { status: 400 })
  }

  const ua = req.headers.get('user-agent') ?? ''
  // Hash simple de IP para privacidad
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? ''

  const { error } = await supabase.from('ar_events').insert({
    experience_id: body.experience_id,
    event_type:    body.event_type,
    user_agent:    ua,
    ip_hash:       ip ? Buffer.from(ip).toString('base64') : null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Actualizar contador en la experiencia
  if (body.event_type === 'scan') {
    await supabase.rpc('increment_ar_scan', { exp_id: body.experience_id })
  } else if (body.event_type === 'ar_launch') {
    await supabase.rpc('increment_ar_launch', { exp_id: body.experience_id })
  }

  return NextResponse.json({ ok: true })
}
