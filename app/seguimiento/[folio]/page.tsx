// Ruta PÚBLICA: /seguimiento/[folio]
// No requiere autenticación
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import SeguimientoClient from '@/app/admin/(protected)/cliente/[folio]/SeguimientoClient'

function getSupabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folio: string }>
}): Promise<Metadata> {
  const { folio } = await params
  return {
    title: `Seguimiento ${folio.toUpperCase()} — Artia Studio`,
    description: 'Consulta el estado de tu pedido en Artia Studio',
  }
}

export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ folio: string }>
}) {
  const { folio } = await params
  const supabase  = getSupabasePublic()

  const { data: lead } = await supabase
    .from('leads')
    .select('folio, nombre, servicio, estado, mensaje, created_at')
    .eq('folio', folio.toUpperCase())
    .maybeSingle()

  return <SeguimientoClient lead={lead ?? null} folio={folio.toUpperCase()} />
}
