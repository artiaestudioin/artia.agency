import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { data, error } = await supabase
    .from('leads')
    .update({ estado })
    .eq('id', id)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Lead no encontrado o sin permisos para actualizar' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

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

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('folio', folio)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Lead no encontrado con ese folio' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id   = searchParams.get('id')
  const hard = searchParams.get('hard')

  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  if (hard !== '1') {
    return NextResponse.json({ error: 'Operación no permitida sin ?hard=1' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Lead no encontrado o sin permisos para eliminar' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}