import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `ar-${id}`
}

// POST /api/ar/experiences/[id]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from('ar_experiences')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Experiencia no encontrada' }, { status: 404 })
  }

  const slug = generateSlug()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://artia.agency'

  const { id: _id, created_at, updated_at, qr_code_url, scan_count, ar_launch_count, ...rest } = original

  const { data, error } = await supabase
    .from('ar_experiences')
    .insert({
      ...rest,
      title: `${original.title} (copia)`,
      slug,
      public_url: `${baseUrl}/ar/${slug}`,
      status: 'draft',
      scan_count: 0,
      ar_launch_count: 0,
      qr_code_url: null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
