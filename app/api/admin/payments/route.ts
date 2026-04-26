import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { amount, method, status, description, fecha, comprobante_url } = body

  const updates: Record<string, any> = {}
  if (amount !== undefined)          updates.amount          = amount
  if (method !== undefined)          updates.method          = method
  if (status !== undefined)          updates.status          = status
  if (description !== undefined)     updates.description     = description
  if (fecha !== undefined)           updates.fecha           = fecha
  if (comprobante_url !== undefined) updates.comprobante_url = comprobante_url

  const { error } = await supabase.from('payments').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Re-calcular payment_status del lead
  const { data: pay } = await supabase.from('payments').select('lead_id').eq('id', id).single()
  if (pay?.lead_id) {
    const { data: allPays } = await supabase.from('payments').select('amount, status').eq('lead_id', pay.lead_id)
    const { data: lead }    = await supabase.from('leads').select('estimated_value').eq('id', pay.lead_id).single()
    const pagado    = (allPays ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
    const expected  = lead?.estimated_value ?? 0
    const newStatus = pagado > 0 && expected > 0 && pagado >= expected ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
    await supabase.from('leads').update({ payment_status: newStatus }).eq('id', pay.lead_id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: pay } = await supabase.from('payments').select('lead_id').eq('id', id).single()
  const { error }     = await supabase.from('payments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (pay?.lead_id) {
    const { data: allPays } = await supabase.from('payments').select('amount, status').eq('lead_id', pay.lead_id)
    const { data: lead }    = await supabase.from('leads').select('estimated_value').eq('id', pay.lead_id).single()
    const pagado    = (allPays ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
    const expected  = lead?.estimated_value ?? 0
    const newStatus = pagado > 0 && expected > 0 && pagado >= expected ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
    await supabase.from('leads').update({ payment_status: newStatus }).eq('id', pay.lead_id)
  }

  return NextResponse.json({ ok: true })
}