import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/templates — lista todas las plantillas
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('id, name, description, updated_at')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/templates — crear nueva plantilla
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verificar que hay sesión activa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, description, html, gjsData } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert([{
      name:        name.trim(),
      description: description?.trim() ?? '',
      html,
      gjs_data:    gjsData,
    }])
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
