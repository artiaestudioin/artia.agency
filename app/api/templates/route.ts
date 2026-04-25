import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/templates — listar plantillas
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('id, name, description, pdf_attachments, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

// POST /api/templates — crear plantilla (ahora soporta pdf_attachments)
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, description, html, gjsData, pdfAttachments = [] } = await req.json()

  if (!name?.trim() || !html) {
    return NextResponse.json({ error: 'name y html son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert([{
      name:            name.trim(),
      description:     description ?? '',
      html,
      gjs_data:        gjsData ?? {},
      pdf_attachments: pdfAttachments,
    }])
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id })
}
