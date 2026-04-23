import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://artiaagency.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function sanitize(val: unknown, max = 300): string {
  if (typeof val !== 'string') return ''
  return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const nombre   = sanitize(body.nombre,   100)
    const email    = sanitize(body.email,    200)
    const telefono = sanitize(body.telefono,  50)
    const servicio = sanitize(body.servicio, 100)
    const mensaje  = sanitize(body.mensaje,  500)
    const fuente   = sanitize(body.fuente,    80) // qué página lo generó

    if (!nombre || !servicio) {
      return NextResponse.json(
        { error: 'Nombre y servicio son obligatorios.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('leads')
      .insert([{ nombre, email: email || null, telefono: telefono || null, servicio, mensaje: mensaje || fuente || null }])
      .select('folio_num')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      // No bloqueamos al usuario — el lead de WhatsApp ya fue enviado
      return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: CORS_HEADERS })
    }

    // Generar y guardar folio
    const folio = 'ASMKT-' + String(361 + (data.folio_num ?? 0)).padStart(4, '0')
    await supabase.from('leads').update({ folio }).eq('folio_num', data.folio_num)

    return NextResponse.json({ ok: true, folio }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('leads API error:', err)
    return NextResponse.json({ ok: false }, { status: 500, headers: CORS_HEADERS })
  }
}
