import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/admin/lead-payment-status
 * Body: { id: string, payment_status: string }
 *
 * Called by Vista360Client and FinanzasClient after every contract/installment change
 * to keep the leads.payment_status column in sync with computed financial logic.
 *
 * Accepted values per DB constraint:
 * (payment_status = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'pagado'::text]))
 */

const VALID_STATUSES = new Set(['pendiente', 'parcial', 'pagado'])

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, payment_status } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    if (!payment_status || !VALID_STATUSES.has(payment_status)) {
      return NextResponse.json(
        { error: `payment_status inválido: ${payment_status}. Válidos: ${[...VALID_STATUSES].join(', ')}` },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('leads')
      .update({ payment_status })
      .eq('id', id)

    if (error) {
      console.error('[lead-payment-status] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id, payment_status })
  } catch (err) {
    console.error('[lead-payment-status] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}