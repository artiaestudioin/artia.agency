import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE_MB = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const ALLOWED_TYPES: Record<string, string> = {
  'model/gltf-binary':          'glb',
  'application/octet-stream':   'glb',   // .glb a veces llega como octet-stream
  'model/vnd.usdz+zip':        'usdz',
  'application/zip':            'usdz',  // .usdz a veces llega como zip
  'image/jpeg':                 'image',
  'image/png':                  'image',
  'image/webp':                 'image',
  'audio/mpeg':                 'audio',
  'audio/ogg':                  'audio',
  'audio/wav':                  'audio',
  'video/mp4':                  'video',
  'video/webm':                 'video',
}

// POST /api/ar/upload
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
  }

  const file          = formData.get('file') as File | null
  const experience_id = formData.get('experience_id') as string | null

  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  if (!experience_id) return NextResponse.json({ error: 'experience_id es requerido' }, { status: 400 })

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: `El archivo supera el límite de ${MAX_SIZE_MB}MB` }, { status: 413 })
  }

  const mime = file.type
  const fileType = ALLOWED_TYPES[mime]

  // Intentar inferir por extensión si el mime no coincide
  const ext = file.name.split('.').pop()?.toLowerCase()
  const inferredType = fileType ?? (
    ext === 'glb'  ? 'glb'  :
    ext === 'usdz' ? 'usdz' :
    ext === 'mp3' || ext === 'ogg' || ext === 'wav' ? 'audio' :
    null
  )

  if (!inferredType) {
    return NextResponse.json({ error: `Tipo de archivo no permitido: ${mime}` }, { status: 415 })
  }

  const timestamp = Date.now()
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${experience_id}/${timestamp}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('ar-assets')
    .upload(storagePath, buffer, {
      contentType: mime || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('ar-assets')
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl

  // Registrar en ar_assets
  const { data: asset, error: assetError } = await supabase
    .from('ar_assets')
    .insert({
      experience_id,
      file_name:  file.name,
      file_url:   publicUrl,
      file_type:  inferredType,
      file_size:  file.size,
      mime_type:  mime,
    })
    .select()
    .single()

  if (assetError) {
    return NextResponse.json({ error: assetError.message }, { status: 500 })
  }

  return NextResponse.json({ data: asset, url: publicUrl }, { status: 201 })
}
