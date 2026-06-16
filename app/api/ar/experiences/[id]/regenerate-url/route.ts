import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/ar/experiences/[id]/regenerate-url
// Regenera la URL pública usando el host real del request (útil en dev / cambio de dominio)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: exp, error: fetchErr } = await supabase
    .from('ar_experiences')
    .select('slug')
    .eq('id', id)
    .single()

  if (fetchErr || !exp) {
    return NextResponse.json({ error: 'Experiencia no encontrada' }, { status: 404 })
  }

  const reqUrl  = new URL(req.url)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ?? `${reqUrl.protocol}//${reqUrl.host}`
  const public_url = `${baseUrl}/ar/${exp.slug}`

  const { data, error } = await supabase
    .from('ar_experiences')
    .update({ public_url })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, public_url })
}
