import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Body JSON inválido' },
      { status: 400 }
    )
  }

  const leadId = String(body.leadId ?? '')
  const mensaje = String(body.mensaje ?? '').trim()
  const previousMensaje = String(body.previous_mensaje ?? '')

  if (!leadId) {
    return NextResponse.json(
      { error: 'ID de lead requerido' },
      { status: 400 }
    )
  }

  const sc = getServiceClient()

  // Update the lead's mensaje field
  const { error } = await sc
    .from('leads')
    .update({
      mensaje: mensaje || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error updating mensaje:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Optionally log to history table if it exists
  try {
    await sc.from('lead_message_history').insert({
      lead_id: leadId,
      previous_text: previousMensaje || null,
      new_text: mensaje || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // History table is optional — don't fail if it doesn't exist
  }

  return NextResponse.json({ ok: true })
}