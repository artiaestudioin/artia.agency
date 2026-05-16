import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const PREFIJOS: Record<string, string> = {
  marketing:  'ASMKT',
  impresion:  'ASIMP',
  fotografia: 'ASFOT',
  branding:   'ASBRD',
  web:        'ASWEB',
  otro:       'ASMKT',
}

function getServiceClient() {
  return createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function sanitize(val: unknown, max = 300): string {
  if (typeof val !== 'string') return ''
  return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()

  const nombre    = sanitize(body.nombre,    100)
  const email     = sanitize(body.email,     200)
  const telefono  = sanitize(body.telefono,   50)
  const servicio  = sanitize(body.servicio,  150)
  const mensaje   = sanitize(body.mensaje,   800)
  const categoria = sanitize(body.categoria,  50)

  if (!nombre || !servicio) {
    return NextResponse.json({ error: 'Nombre y servicio son obligatorios.' }, { status: 400 })
  }

  const sc = getServiceClient()

  const { data, error } = await sc
    .from('leads')
    .insert([{
      nombre,
      email:           email || null,
      telefono:        telefono || null,
      servicio,
      notes:           mensaje || null,
      estado:          'nuevo',
      payment_status:  'sin_contrato',
      estimated_value: (body.estimated_value !== undefined && body.estimated_value !== '' && body.estimated_value !== null)
                         ? parseFloat(body.estimated_value)
                         : null,
    }])
    .select('folio_num')
    .single()

  if (error) {
    console.error('Error creando lead manual:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const prefijo = PREFIJOS[categoria] ?? 'ASMKT'
  const folio   = prefijo + '-' + String(361 + (data.folio_num ?? 0)).padStart(4, '0')

  await sc.from('leads').update({ folio }).eq('folio_num', data.folio_num)

  return NextResponse.json({ ok: true, folio })
}