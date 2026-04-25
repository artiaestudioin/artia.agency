import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { leadId, notes } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })

  const { error } = await supabase
    .from('leads')
    .update({ notes })
    .eq('id', leadId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
