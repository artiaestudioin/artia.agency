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
