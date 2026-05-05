import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/admin/landings — list all landing pages */
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('landing_pages')
    .select('id, title, slug, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ landings: data })
}

/** POST /api/admin/landings — create new landing page */
export async function POST(req: Request) {
  try {
    const body  = await req.json()
    const { title, slug, status = 'draft' } = body

    if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

    const supabase = await createClient()

    // Auto-generate slug if not provided
    const finalSlug = slug?.trim() || title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)

    const { data, error } = await supabase
      .from('landing_pages')
      .insert({ title: title.trim(), slug: finalSlug, status })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ landing: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
