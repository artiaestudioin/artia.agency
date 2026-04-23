import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { folio, estado, notas_internas } = await req.json()
  if (!folio || !estado) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const ESTADOS_VALIDOS = ['nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido']
  if (!ESTADOS_VALIDOS.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const update: any = { estado }
  if (notas_internas !== undefined) update.notas_internas = notas_internas

  const { error } = await supabase
    .from('leads')
    .update(update)
    .eq('folio', folio)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
