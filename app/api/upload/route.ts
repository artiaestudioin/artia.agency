import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase  = getAdminClient()
    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file)      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

    // Verificar tamaño máximo 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 50MB)' }, { status: 400 })
    }

    // Limpiar nombre de archivo
    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50)
    const fileName = `${baseName}_${Date.now()}.${ext}`
    const path     = `project-${projectId}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    // Intentar subir
    const { error: uploadError } = await supabase.storage
      .from('projects')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
        return NextResponse.json({
          error: 'El bucket "projects" no existe en Supabase Storage. Ve a Storage → New bucket → "projects" → Public.',
        }, { status: 500 })
      }
      return NextResponse.json({ error: `Error de storage: ${uploadError.message}` }, { status: 500 })
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
      .select().single()

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
    const supabase = getAdminClient()
    const { fileId, projectId } = await req.json()
    if (!fileId || !projectId) return NextResponse.json({ error: 'fileId y projectId requeridos' }, { status: 400 })

    const { data: fileRecord } = await supabase
      .from('project_files').select('file_url, file_name').eq('id', fileId).single()

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