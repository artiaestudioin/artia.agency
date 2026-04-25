import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { lead_id, amount, method, status, description, fecha } = body

  if (!lead_id || !amount) {
    return NextResponse.json({ error: 'lead_id y amount son requeridos' }, { status: 400 })
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert([{ lead_id, amount, method, status, description, fecha }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Actualizar payment_status del lead según pagos registrados
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('lead_id', lead_id)

  const totalPagado   = (allPayments ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const totalPendiente= (allPayments ?? []).filter(p => p.status === 'pendiente').reduce((s, p) => s + p.amount, 0)

  const { data: lead } = await supabase.from('leads').select('estimated_value').eq('id', lead_id).single()
  const expected = lead?.estimated_value ?? 0

  let newPaymentStatus = 'pendiente'
  if (totalPagado > 0 && expected > 0 && totalPagado >= expected) {
    newPaymentStatus = 'pagado'
  } else if (totalPagado > 0) {
    newPaymentStatus = 'parcial'
  }

  await supabase.from('leads').update({ payment_status: newPaymentStatus }).eq('id', lead_id)

  return NextResponse.json({ ok: true, payment })
}
