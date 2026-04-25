import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()

  const formData = await req.formData()
  const file     = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo se permiten PDFs' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'El PDF no debe superar 10 MB' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.\-]/g, '_').slice(0, 100)
  const path     = `attachments/${Date.now()}_${safeName}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('email-attachments')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    // Si el bucket no existe, dar instrucciones claras
    if (uploadError.message.includes('Bucket not found')) {
      return NextResponse.json({
        error: 'Bucket "email-attachments" no existe. Créalo en Supabase Storage con acceso público.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('email-attachments').getPublicUrl(path)

  return NextResponse.json({ ok: true, url: publicUrl, name: file.name, size: file.size })
}
