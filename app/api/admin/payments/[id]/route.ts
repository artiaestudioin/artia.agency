import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { contract_value, description, payment_month, status, installments } = body

  // Actualizar parent
  const updates: Record<string, any> = {}
  if (contract_value !== undefined) updates.contract_value = parseFloat(contract_value)
  if (description !== undefined) updates.description = description
  if (payment_month !== undefined) updates.payment_month = payment_month
  if (status !== undefined) updates.status = status

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('payment_parents').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Actualizar/crear/eliminar cuotas
  if (installments) {
    // Obtener cuotas existentes
    const { data: existing } = await supabase
      .from('payment_installments')
      .select('id')
      .eq('payment_id', id)

    const existingIds = new Set(existing?.map((e: any) => e.id) || [])
    const incomingIds = new Set(installments.filter((i: any) => i.id).map((i: any) => i.id))

    // Eliminar cuotas removidas
    const toDelete = Array.from(existingIds).filter((eid) => !incomingIds.has(eid))
    if (toDelete.length > 0) {
      await supabase.from('payment_installments').delete().in('id', toDelete)
    }

    // Upsert cuotas
    for (const inst of installments) {
      const instData = {
        payment_id: id,
        amount: parseFloat(inst.amount),
        payment_date: inst.payment_date,
        status: inst.status || 'pendiente',
        payment_number: inst.payment_number,
        receipt_url: inst.receipt_url || null,
      }

      if (inst.id && existingIds.has(inst.id)) {
        await supabase.from('payment_installments').update(instData).eq('id', inst.id)
      } else {
        await supabase.from('payment_installments').insert(instData)
      }
    }
  }

  // Recalcular estado del lead
  const { data: parent } = await supabase.from('payment_parents').select('lead_id, contract_value').eq('id', id).single()
  if (parent) {
    const { data: allInsts } = await supabase
      .from('payment_installments')
      .select('amount, status')
      .eq('payment_id', id)
    
    const pagado = (allInsts || []).filter((i: any) => i.status === 'pagado').reduce((s: number, i: any) => s + i.amount, 0)
    const newStatus = pagado >= parent.contract_value ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
    await supabase.from('leads').update({ payment_status: newStatus }).eq('id', parent.lead_id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Obtener lead_id antes de eliminar
  const { data: parent } = await supabase.from('payment_parents').select('lead_id').eq('id', id).single()
  
  const { error } = await supabase.from('payment_parents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcular estado del lead
  if (parent?.lead_id) {
    const { data: allParents } = await supabase
      .from('payment_parents')
      .select('id, contract_value')
      .eq('lead_id', parent.lead_id)
    
    let totalPagado = 0
    let totalExpected = 0

    for (const p of allParents || []) {
      totalExpected += p.contract_value
      const { data: insts } = await supabase
        .from('payment_installments')
        .select('amount, status')
        .eq('payment_id', p.id)
      totalPagado += (insts || []).filter((i: any) => i.status === 'pagado').reduce((s: number, i: any) => s + i.amount, 0)
    }

    const newStatus = totalPagado >= totalExpected && totalExpected > 0 ? 'pagado' : totalPagado > 0 ? 'parcial' : 'pendiente'
    await supabase.from('leads').update({ payment_status: newStatus }).eq('id', parent.lead_id)
  }

  return NextResponse.json({ ok: true })
}