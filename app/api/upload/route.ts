import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'email-assets'
const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Solo admin autenticado puede subir
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Leer el archivo del form-data
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  // Validar tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({
      error: `Tipo no permitido. Solo: JPG, PNG, WEBP, GIF, SVG`
    }, { status: 400 })
  }

  // Validar tamaño
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({
      error: `El archivo supera los ${MAX_SIZE_MB}MB`
    }, { status: 400 })
  }

  // Nombre único: timestamp + nombre original sanitizado
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeName = file.name
    .replace(/\.[^.]+$/, '')           // quitar extensión
    .replace(/[^a-zA-Z0-9_-]/g, '-')  // solo caracteres seguros
    .slice(0, 50)
  const fileName = `${Date.now()}-${safeName}.${ext}`
  const filePath = `uploads/${fileName}`

  // Convertir File a ArrayBuffer para Supabase
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Subir al bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1 año de caché
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  return NextResponse.json({ ok: true, url: publicUrl, path: filePath })
}
