import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** DELETE /api/admin/landings/[id] — delete landing page and its variants */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const supabase = await createClient()

  // Delete variants first (cascades from FK, but explicit for safety)
  await supabase.from('landing_variants').delete().eq('landing_id', id)

  const { error } = await supabase.from('landings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

/** PATCH /api/admin/landings/[id] — update landing page */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params
  const body    = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('landings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ landing: data })
}