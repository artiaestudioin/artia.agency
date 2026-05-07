import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function sanitize(val: unknown, max = 300): string {
  if (typeof val !== 'string') return ''
  return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, max)
}

// PATCH /api/admin/lead-edit — editar campos de un lead desde el panel de clientes
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const nombre          = sanitize(body.nombre,   100)
  const email           = sanitize(body.email,    200)
  const telefono        = sanitize(body.telefono,  50)
  const servicio        = sanitize(body.servicio, 150)
  const notes           = sanitize(body.notes,    800)
  const estado          = sanitize(body.estado,    50)
  const payment_status  = sanitize(body.payment_status, 50)

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  }

  const estadosValidos = ['nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido']
  if (estado && !estadosValidos.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const payValidos = ['pendiente', 'parcial', 'pagado', 'vencido', 'sin_contrato']
  if (payment_status && !payValidos.includes(payment_status)) {
    return NextResponse.json({ error: 'Estado de pago inválido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    nombre,
    email:           email || null,
    telefono:        telefono || null,
    servicio:        servicio || null,
    notes:           notes || null,
    estado:          estado || 'nuevo',
    payment_status:  payment_status || 'pendiente',
    estimated_value: body.estimated_value != null && body.estimated_value !== ''
                       ? Number(body.estimated_value)
                       : null,
  }

  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error editando lead:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
