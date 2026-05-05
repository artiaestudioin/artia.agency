import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** PATCH /api/admin/utm-links/[id] */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('utm_links')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

/** DELETE /api/admin/utm-links/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('utm_links').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}