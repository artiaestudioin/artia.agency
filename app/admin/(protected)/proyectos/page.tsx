import { createClient } from '@/lib/supabase/server'
import ProyectosClient from './ProyectosClient'

export const metadata = { title: 'Proyectos — Artia Admin' }

export default async function ProyectosPage() {
  const supabase = await createClient()
  const { data: proyectos, error } = await supabase
    .from('proyectos')
    .select('*')
    .order('created_at', { ascending: false })

  return <ProyectosClient proyectos={proyectos ?? []} error={error?.message} />
}
