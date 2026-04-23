import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'email-assets'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('uploads', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Añadir URL pública a cada imagen
  const images = (data ?? [])
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => {
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`uploads/${f.name}`)
      return {
        name:       f.name,
        url:        publicUrl,
        path:       `uploads/${f.name}`,
        size:       f.metadata?.size ?? 0,
        created_at: f.created_at ?? '',
      }
    })

  return NextResponse.json({ images })
}
