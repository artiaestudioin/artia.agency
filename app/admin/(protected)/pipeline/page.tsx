import { createClient } from '@/lib/supabase/server'
import PipelineKanban from './PipelineKanban'

export const metadata = { title: 'Pipeline — Artia Admin' }

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('id, folio, nombre, servicio, estado, estimated_value, payment_status')
    .order('created_at', { ascending: false })

  return <PipelineKanban leads={leads ?? []} />
}