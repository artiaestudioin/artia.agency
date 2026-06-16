import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateARExperienceInput } from '@/types/ar'
import { DEFAULT_AR_EXPERIENCE } from '@/types/ar'

function generateSlug(): string {
  // e.g. "ar-x7k2m9"
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `ar-${id}`
}

// GET /api/ar/experiences  → listar todas (admin)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const status    = searchParams.get('status')
  const occasion  = searchParams.get('occasion')
  const campaign  = searchParams.get('campaign_id')
  const page      = parseInt(searchParams.get('page') ?? '1', 10)
  const limit     = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset    = (page - 1) * limit

  let query = supabase
    .from('ar_experiences')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)   query = query.eq('status', status)
  if (occasion) query = query.eq('occasion', occasion)
  if (campaign) query = query.eq('campaign_id', campaign)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count, page, limit })
}

// POST /api/ar/experiences  → crear nueva experiencia
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  let body: CreateARExperienceInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'El campo title es requerido' }, { status: 400 })
  }

  const slug = generateSlug()
  // Usar NEXT_PUBLIC_BASE_URL si está seteado, si no auto-detectar del request
  const reqUrl  = new URL(req.url)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ?? `${reqUrl.protocol}//${reqUrl.host}`
  const public_url = `${baseUrl}/ar/${slug}`

  const payload = {
    ...DEFAULT_AR_EXPERIENCE,
    ...body,
    slug,
    public_url,
    status: 'draft' as const,
  }

  const { data, error } = await supabase
    .from('ar_experiences')
    .insert(payload)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
