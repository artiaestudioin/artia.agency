import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/admin/lead-estado — actualizar estado por id (desde pipeline/vista360)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, estado } = await req.json()

  if (!id || !estado) {
    return NextResponse.json({ error: 'id y estado son requeridos' }, { status: 400 })
  }

  const estadosValidos = ['nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido']
  if (!estadosValidos.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('leads')
    .update({ estado })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// POST /api/admin/lead-estado — actualizar estado por folio (backwards compat)
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { folio, estado, notas_internas, notes } = body

  if (!folio || !estado) {
    return NextResponse.json({ error: 'folio y estado son requeridos' }, { status: 400 })
  }

  const updates: Record<string, string> = { estado }
  if (notas_internas !== undefined) updates.notes = notas_internas
  if (notes !== undefined) updates.notes = notes

  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('folio', folio)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { estimated_value } = body

  const updates: Record<string, any> = {}
  if (estimated_value !== undefined) updates.estimated_value = estimated_value

  const { error } = await supabase.from('leads').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcular payment_status del lead
  const { data: allPays } = await supabase.from('payments').select('amount, status').eq('lead_id', id)
  const { data: lead }    = await supabase.from('leads').select('estimated_value').eq('id', id).single()
  const pagado   = (allPays ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const expected = lead?.estimated_value ?? 0
  const newStatus = pagado > 0 && expected > 0 && pagado >= expected ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
  await supabase.from('leads').update({ payment_status: newStatus }).eq('id', id)

  return NextResponse.json({ ok: true })
}

