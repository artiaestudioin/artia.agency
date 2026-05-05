import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/admin/landings — list landing pages from 'landings' table */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('landings')
    .select('id, name, slug, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ landings: data })
}

/** POST /api/admin/landings — create new landing page */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, slug, status = 'draft' } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const supabase = await createClient()

    const finalSlug = slug?.trim() || name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)

    const { data, error } = await supabase
      .from('landings')
      .insert({ name: name.trim(), slug: finalSlug, status })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ landing: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}