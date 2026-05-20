import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      `Missing env vars: SUPABASE_URL=${url ? 'OK' : 'MISSING'}, SUPABASE_SERVICE_ROLE_KEY=${key ? 'OK' : 'MISSING'}`
    )
  }
  return createServiceClient(url, key)
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const leadId = String(body.leadId ?? '')
    const mensaje = String(body.mensaje ?? '').trim()
    const previousMensaje = String(body.previous_mensaje ?? '')

    if (!leadId) {
      return NextResponse.json({ error: 'ID de lead requerido' }, { status: 400 })
    }

    const sc = getServiceClient()

    // ── Actualizar lead ──
    const { error: updateError } = await sc
      .from('leads')
      .update({
        mensaje: mensaje || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('[lead-mensaje] Supabase update error:', updateError)
      return NextResponse.json(
        { error: updateError.message, hint: 'lead update failed', code: updateError.code },
        { status: 500 }
      )
    }

    // ── Historial (opcional, no bloqueante) ──
    try {
      const { error: histError } = await sc.from('lead_message_history').insert({
        lead_id: leadId,
        previous_text: previousMensaje || null,
        new_text: mensaje || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      if (histError) {
        console.warn('[lead-mensaje] History insert warning:', histError.message)
      }
    } catch (histErr) {
      console.warn('[lead-mensaje] History table probably missing:', histErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[lead-mensaje] Unhandled error:', err)
    return NextResponse.json(
      { error: err.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}