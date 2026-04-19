import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/templates/:id — obtener una plantilla
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('id, name, description, html, gjs_data, updated_at')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/templates/:id — actualizar plantilla existente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, description, html, gjsData } = await req.json()

  const { error } = await supabase
    .from('email_templates')
    .update({
      name:        name?.trim(),
      description: description?.trim() ?? '',
      html,
      gjs_data:    gjsData,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/templates/:id — eliminar plantilla
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
