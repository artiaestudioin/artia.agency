import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

function getAdminClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── PROJECT FILES (existente) ────────────────────────────────────

async function handleProjectFileUpload(req: NextRequest, supabase: ReturnType<typeof getAdminClient>) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 50MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50)
  const fileName = `${baseName}_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`
  const path = `project-${projectId}/${fileName}`

  const buffer = Buffer.from(await file.arrayBuffer())

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
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }])
    .select().single()

  if (dbError) {
    return NextResponse.json({ error: `Error en DB: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, file: fileRecord })
}

async function handleProjectFileDelete(req: NextRequest, supabase: ReturnType<typeof getAdminClient>) {
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
}

// ─── PAYMENT RECEIPTS (nuevo) ─────────────────────────────────────

async function handlePaymentReceiptUpload(req: NextRequest, supabase: ReturnType<typeof getAdminClient>) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const paymentId = (formData.get('payment_id') as string | null) || 'general'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ 
      error: 'Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WEBP, GIF) y PDF.' 
    }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 10MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50)
  const fileName = `${baseName}_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`
  const path = `payments/${paymentId}/${fileName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(path, buffer, { 
      contentType: file.type || 'application/octet-stream', 
      upsert: false 
    })

  if (uploadError) {
    console.error('Storage upload error (comprobantes):', uploadError)
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
      return NextResponse.json({
        error: 'El bucket "comprobantes" no existe en Supabase Storage. Ve a Storage → New bucket → "comprobantes" → Public.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: `Error de storage: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('comprobantes').getPublicUrl(path)

  return NextResponse.json({ 
    ok: true, 
    url: publicUrl, 
    path,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
  })
}

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient()
    const formData = await req.clone().formData()
    const hasProjectId = formData.has('projectId')

    if (hasProjectId) {
      return handleProjectFileUpload(req, supabase)
    } else {
      return handlePaymentReceiptUpload(req, supabase)
    }

  } catch (err: any) {
    console.error('Upload POST error:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminClient()
    const body = await req.clone().json()
    
    if (body.fileId && body.projectId) {
      return handleProjectFileDelete(req, supabase)
    }
    
    if (body.path) {
      const { error } = await supabase.storage.from('comprobantes').remove([body.path])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Parámetros insuficientes para eliminar' }, { status: 400 })

  } catch (err: any) {
    console.error('Upload DELETE error:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}