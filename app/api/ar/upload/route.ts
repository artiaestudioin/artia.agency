import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_SIZE_MB    = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const BUCKET         = 'ar-assets'

// Usamos service role para uploads (sin RLS) si está disponible, si no anon
function createUploadClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Con service role no necesitamos cookies ni auth
  if (srvKey) {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, srvKey, { auth: { persistSession: false } })
  }

  // Fallback: cliente de server con cookies (requiere sesión activa)
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: async () => {
        const store = await cookies()
        return store.getAll()
      },
      setAll: () => {},
    },
  })
}

const EXT_TO_TYPE: Record<string, string> = {
  glb:  'glb',
  gltf: 'glb',
  usdz: 'usdz',
  jpg:  'image',
  jpeg: 'image',
  png:  'image',
  webp: 'image',
  mp3:  'audio',
  ogg:  'audio',
  wav:  'audio',
  m4a:  'audio',
  aac:  'audio',
  mp4:  'video',
  webm: 'video',
}

const MIME_TO_TYPE: Record<string, string> = {
  'model/gltf-binary':       'glb',
  'model/gltf+json':         'glb',
  'application/octet-stream': 'glb',
  'model/vnd.usdz+zip':     'usdz',
  'application/zip':         'usdz',
  'image/jpeg':  'image',
  'image/png':   'image',
  'image/webp':  'image',
  'audio/mpeg':  'audio',
  'audio/ogg':   'audio',
  'audio/wav':   'audio',
  'audio/mp4':   'audio',
  'audio/x-m4a': 'audio',
  'audio/aac':   'audio',
  'video/mp4':   'video',
  'video/webm':  'video',
}

// POST /api/ar/upload
export async function POST(req: NextRequest) {
  // Verificar variables de entorno
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: 'Supabase no configurado. Revisa las variables de entorno.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
  }

  const file          = formData.get('file') as File | null
  const experience_id = formData.get('experience_id') as string | null

  if (!file)          return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  if (!experience_id) return NextResponse.json({ error: 'experience_id es requerido' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: `El archivo supera el límite de ${MAX_SIZE_MB}MB` }, { status: 413 })
  }

  // Detectar tipo
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fileType = MIME_TO_TYPE[file.type] ?? EXT_TO_TYPE[ext]

  if (!fileType) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido. Usa: .glb, .usdz, .jpg, .png, .mp3, .mp4` },
      { status: 415 }
    )
  }

  const supabase = createUploadClient()

  // Verificar que el bucket existe
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    return NextResponse.json(
      { error: `Error al conectar con Storage: ${bucketsError.message}` },
      { status: 500 }
    )
  }

  const bucketExists = (buckets ?? []).some((b: any) => b.name === BUCKET)
  if (!bucketExists) {
    // Intentar crear el bucket automáticamente
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (createErr && !createErr.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: `El bucket "${BUCKET}" no existe y no se pudo crear automáticamente.`,
          hint: `Crea el bucket manualmente en Supabase Dashboard → Storage → New Bucket → nombre: "ar-assets", público: true`,
          supabase_error: createErr.message,
        },
        { status: 503 }
      )
    }
  }

  // Generar path único
  const timestamp = Date.now()
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${experience_id}/${timestamp}_${safeName}`

  // Convertir File a ArrayBuffer
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo' }, { status: 400 })
  }

  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `Error al subir archivo: ${uploadError.message}` },
      { status: 500 }
    )
  }

  // URL pública
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  // Registrar asset en DB (usando cliente normal con cookies si es posible)
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const dbClient = await createClient()
    await dbClient.from('ar_assets').insert({
      experience_id,
      file_name:  file.name,
      file_url:   publicUrl,
      file_type:  fileType,
      file_size:  file.size,
      mime_type:  file.type,
    })
  } catch {
    // No falla el upload si falla el registro
  }

  return NextResponse.json({ url: publicUrl, file_type: fileType }, { status: 201 })
}
