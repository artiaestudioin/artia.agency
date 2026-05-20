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

// FIX: Valores válidos según constraint leads_payment_status_check
// (payment_status = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'pagado'::text]))
const VALID_PAYMENT_STATUSES = new Set(['pendiente', 'parcial', 'pagado'])

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const nombre    = sanitize(body.nombre,    100)
  const email     = sanitize(body.email,     200)
  const telefono  = sanitize(body.telefono,   50)
  const servicio  = sanitize(body.servicio,  150)
  const mensaje   = sanitize(body.mensaje,   800)
  const categoria = sanitize(body.categoria,  50)
  const estado    = sanitize(body.estado,     50) || 'nuevo'
  
  // FIX CRÍTICO: Validar payment_status contra el constraint de PostgreSQL
  // Solo permite: 'pendiente', 'parcial', 'pagado'
  const payment_status_raw = sanitize(body.payment_status, 50)
  const payment_status = VALID_PAYMENT_STATUSES.has(payment_status_raw)
    ? payment_status_raw
    : 'pendiente'

  // FIX CRÍTICO: Email es NOT NULL en la base de datos
  if (!nombre || !servicio) {
    return NextResponse.json(
      { error: 'Nombre y servicio son obligatorios.' },
      { status: 400 }
    )
  }

  if (!email) {
    return NextResponse.json(
      { error: 'El email es obligatorio.' },
      { status: 400 }
    )
  }

  const sc = getServiceClient()

  const { data, error } = await sc
    .from('leads')
    .insert([{
      nombre,
      email:           email,  // NOT NULL — requerido
      telefono:        telefono || null,
      servicio,
      notes:           mensaje || null,
      estado:          estado || 'nuevo',
      payment_status:  payment_status,
      estimated_value: (body.estimated_value !== undefined && body.estimated_value !== '' && body.estimated_value !== null)
                         ? parseFloat(String(body.estimated_value))
                         : null,
    }])
    .select('folio_num')
    .single()

  if (error) {
    console.error('Error creando lead manual:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.folio_num == null) {
    return NextResponse.json(
      { error: 'No se pudo generar el folio' },
      { status: 500 }
    )
  }

  const prefijo = PREFIJOS[categoria] ?? 'ASMKT'
  const folio   = prefijo + '-' + String(361 + (data.folio_num ?? 0)).padStart(4, '0')

  const { error: updateError } = await sc
    .from('leads')
    .update({ folio })
    .eq('folio_num', data.folio_num)

  if (updateError) {
    console.error('Error actualizando folio:', updateError)
    return NextResponse.json(
      { error: 'Lead creado pero error al generar folio' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, folio, folio_num: data.folio_num })
}