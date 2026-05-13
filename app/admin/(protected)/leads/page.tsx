import { createClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

export const metadata = { title: 'Leads — Artia Admin' }

// Force fresh server render on every request so deletions/edits
// are always reflected immediately after F5 (no stale CDN/Next cache).
export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, folio, nombre, email, telefono, servicio, estado, payment_status, estimated_value, created_at, notes')
    .order('created_at', { ascending: false })

  return <LeadsClient leads={leads ?? []} />
}
