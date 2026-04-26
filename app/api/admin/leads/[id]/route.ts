import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { estimated_value } = body

  const updates: Record<string, any> = {}
  if (estimated_value !== undefined) updates.estimated_value = estimated_value

  const { error } = await supabase.from('leads').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcular payment_status del lead
  const { data: allPays } = await supabase.from('payments').select('amount, status').eq('lead_id', id)
  const { data: lead }    = await supabase.from('leads').select('estimated_value').eq('id', id).single()
  const pagado   = (allPays ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const expected = lead?.estimated_value ?? 0
  const newStatus = pagado > 0 && expected > 0 && pagado >= expected ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
  await supabase.from('leads').update({ payment_status: newStatus }).eq('id', id)

  return NextResponse.json({ ok: true })
}