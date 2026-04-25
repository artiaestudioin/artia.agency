import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/admin/project-files — sube archivo a carpeta project-{id}/
export async function POST(req: NextRequest) {
  const supabase = getSupabase()

  const formData  = await req.formData()
  const file      = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null

  if (!file || !projectId) {
    return NextResponse.json({ error: 'file y projectId son requeridos' }, { status: 400 })
  }

  // Verificar que el proyecto existe
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const ext      = file.name.split('.').pop() ?? ''
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
  const fileName = `${baseName}_${Date.now()}.${ext}`
  const path     = `project-${projectId}/${fileName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('projects')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('projects').getPublicUrl(path)

  const { data: fileRecord, error: dbError } = await supabase
    .from('project_files')
    .insert([{
      project_id: projectId,
      file_url:   publicUrl,
      file_name:  file.name,
      file_type:  file.type,
      file_size:  file.size,
    }])
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, file: fileRecord })
}

// DELETE /api/admin/project-files — elimina archivo
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase()
  const { fileId, projectId } = await req.json()

  if (!fileId || !projectId) {
    return NextResponse.json({ error: 'fileId y projectId requeridos' }, { status: 400 })
  }

  const { data: fileRecord } = await supabase
    .from('project_files')
    .select('file_url, file_name')
    .eq('id', fileId)
    .single()

  if (fileRecord) {
    const path = `project-${projectId}/${fileRecord.file_name}`
    await supabase.storage.from('projects').remove([path])
  }

  await supabase.from('project_files').delete().eq('id', fileId)

  return NextResponse.json({ ok: true })
}
