import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const { project_id, file_url, file_name, file_type, file_size } = body

    if (!project_id || !file_url) {
      return NextResponse.json({ error: 'project_id y file_url requeridos' }, { status: 400 })
    }

    const { data: fileRecord, error: dbError } = await supabase
      .from('project_files')
      .insert([{
        project_id,
        file_url,
        file_name,
        file_type,
        file_size,
      }])
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: `Error en DB: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true, file: fileRecord })

  } catch (err: any) {
    console.error('project-files POST error:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { fileId, projectId } = await req.json()

    if (!fileId || !projectId) {
      return NextResponse.json({ error: 'fileId y projectId requeridos' }, { status: 400 })
    }

    const { data: fileRecord } = await supabase
      .from('project_files')
      .select('file_url, file_name')
      .eq('id', fileId)
      .single()

    if (fileRecord?.file_name) {
      const path = `project-${projectId}/${fileRecord.file_name}`
      await supabase.storage.from('projects').remove([path])
    }

    await supabase.from('project_files').delete().eq('id', fileId)
    return NextResponse.json({ ok: true })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}