import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'email-assets'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { path } = await req.json()

  if (!path || !path.startsWith('uploads/')) {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 })
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
