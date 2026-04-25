import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateAccessCode(): string {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const num    = Math.floor(Math.random() * 9000 + 1000)
  return `ASMK-${suffix}-${num}`
}

// POST /api/admin/projects — crear proyecto manual
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, description, event_date, lead_id } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name es requerido' }, { status: 400 })

  // Generar código único
  let access_code = generateAccessCode()
  for (let i = 0; i < 10; i++) {
    const { data: conflict } = await supabase.from('projects').select('id').eq('access_code', access_code).maybeSingle()
    if (!conflict) break
    access_code = generateAccessCode()
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert([{ name: name.trim(), description, event_date: event_date || null, lead_id: lead_id || null, access_code }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, project })
}
