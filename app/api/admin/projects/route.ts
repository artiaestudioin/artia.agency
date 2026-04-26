import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdmin() {
  return createSupabaseClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/admin/projects — crear proyecto
export async function POST(req: NextRequest) {
  const supabase = getAdmin()
  const { name, description, event_date, lead_id } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name requerido' }, { status: 400 })

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let access_code = ''
  for (let i = 0; i < 10; i++) {
    const s = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const n = Math.floor(Math.random() * 9000 + 1000)
    const c = `ASMK-${s}-${n}`
    const { data: conflict } = await supabase.from('projects').select('id').eq('access_code', c).maybeSingle()
    if (!conflict) { access_code = c; break }
  }
  if (!access_code) return NextResponse.json({ error: 'No se pudo generar código único' }, { status: 500 })

  const { data: project, error } = await supabase
    .from('projects')
    .insert([{ name: name.trim(), description, event_date: event_date || null, lead_id: lead_id || null, access_code }])
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, project })
}

// DELETE /api/admin/projects — eliminar proyecto y sus archivos
export async function DELETE(req: NextRequest) {
  const supabase = getAdmin()
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  // Primero eliminar archivos del storage
  const { data: files } = await supabase
    .from('project_files')
    .select('file_name')
    .eq('project_id', projectId)

  if (files && files.length > 0) {
    const paths = files.map((f: any) => `project-${projectId}/${f.file_name}`).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from('projects').remove(paths)
    }
  }

  // Eliminar archivos de la DB
  await supabase.from('project_files').delete().eq('project_id', projectId)

  // Eliminar el proyecto
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}