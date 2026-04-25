import { createClient } from '@/lib/supabase/server'
import PipelineKanban from './PipelineKanban'

export const metadata = { title: 'Pipeline — Artia Admin' }

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, folio, nombre, email, servicio, estado, estimated_value, payment_status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PipelineKanban leads={leads ?? []} />
    </div>
  )
}
