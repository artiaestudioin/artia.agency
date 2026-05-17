// app/api/catalog/orders/route.ts — v2 con soporte de variantes
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

function sanitize(val: unknown, max = 300): string {
  if (typeof val !== 'string') return ''
  return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, max)
}

const ok  = (data: unknown) => NextResponse.json(data, { headers: CORS })
const err = (msg: string, status = 400) =>
  NextResponse.json({ ok: false, error: msg }, { status, headers: CORS })

// ─── POST: Create order from website ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const customerName  = sanitize(body.customer_name, 100)
    const customerPhone = sanitize(body.customer_phone, 50)
    const customerEmail = sanitize(body.customer_email, 200)
    const notes         = sanitize(body.notes, 500)
    const source        = sanitize(body.source || 'website', 30)

    // Items: [{ product_id, variant_id?, name, qty, unit_price, sku? }]
    const items: Array<{
      product_id: string; variant_id?: string | null
      name: string; qty: number; unit_price: number; sku?: string | null
    }> = body.items || []

    if (!items.length) return err('Se requiere al menos un producto')
    for (const item of items) {
      if (!item.product_id || !item.qty || item.qty < 1 || !item.unit_price)
        return err('Datos de producto inválidos')
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── 1. Verify products exist and are active ───────────────────
    const productIds = [...new Set(items.map(i => i.product_id))]
    const { data: products, error: prodErr } = await supabase
      .from('catalog_products')
      .select('id, name, price, active, stock_qty, stock_status, track_stock, low_stock_threshold')
      .in('id', productIds)
      .eq('active', true)

    if (prodErr || !products?.length) return err('Productos no encontrados o inactivos')

    // ── 2. Verify variants (if provided) ─────────────────────────
    const variantIds = items.map(i => i.variant_id).filter(Boolean) as string[]
    let variantMap: Record<string, any> = {}

    if (variantIds.length) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, product_id, variant_name, quantity, market_price, shipping_cost, stock_status, stock_qty')
        .in('id', variantIds)
        .eq('active', true)

      ;(variants || []).forEach(v => { variantMap[v.id] = v })

      for (const item of items) {
        if (item.variant_id && !variantMap[item.variant_id]) {
          return err(`Variante no encontrada: ${item.variant_id}`)
        }
      }
    }

    // ── 3. Check stock for tracked products ───────────────────────
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)!
      if (product.track_stock) {
        if (product.stock_status === 'out_of_stock')
          return err(`"${product.name}" no tiene stock disponible`)
        if (product.stock_qty < item.qty)
          return err(`Stock insuficiente para "${product.name}". Disponible: ${product.stock_qty}`)
      }
    }

    // ── 4. Enrich items with variant data ─────────────────────────
    const enriched = items.map(item => {
      const variant = item.variant_id ? variantMap[item.variant_id] : null
      const unitPrice = item.unit_price || (variant?.market_price ?? 0)
      return {
        product_id:   item.product_id,
        variant_id:   item.variant_id || null,
        name:         item.name,
        variant_name: variant?.variant_name || null,
        qty:          item.qty,
        unit_price:   unitPrice,
        subtotal:     unitPrice * item.qty,
        sku:          item.sku || null,
      }
    })

    const subtotal      = enriched.reduce((s, i) => s + i.subtotal, 0)
    const shippingTotal = enriched.reduce((s, i) => {
      const variant = i.variant_id ? variantMap[i.variant_id] : null
      return s + (variant?.shipping_cost || 0)
    }, 0)
    const total = subtotal  // shipping already included in market_price per Artia's model

    // ── 5. Create or find CRM lead ────────────────────────────────
    let leadId: string | null = null

    if (customerName || customerEmail || customerPhone) {
      let existingLead: any = null

      if (customerEmail) {
        const { data } = await supabase.from('leads').select('id').eq('email', customerEmail).maybeSingle()
        existingLead = data
      }
      if (!existingLead && customerPhone) {
        const { data } = await supabase.from('leads').select('id').eq('telefono', customerPhone).maybeSingle()
        existingLead = data
      }

      if (existingLead) {
        leadId = existingLead.id
        await supabase.from('leads').update({ estado: 'en_proceso' }).eq('id', leadId).eq('estado', 'nuevo')
      } else if (customerName) {
        const productList = enriched.map(i => `${i.qty}x ${i.name}`).join(', ')
        const { data: newLead, error: leadErr } = await supabase
          .from('leads')
          .insert({
            nombre:   customerName,
            email:    customerEmail || null,
            telefono: customerPhone || null,
            servicio: `Catálogo — ${productList}`.slice(0, 120),
            estado:   'nuevo',
            notes:    `Pedido catálogo web. Total: $${total.toFixed(2)}`,
          })
          .select('id, folio_num')
          .single()

        if (!leadErr && newLead) {
          leadId = newLead.id
          const folio = 'ASIMP-' + String(361 + (newLead.folio_num ?? 0)).padStart(4, '0')
          await supabase.from('leads').update({ folio }).eq('id', leadId)
        }
      }
    }

    // ── 6. Create order ───────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from('catalog_orders')
      .insert({
        customer_name:   customerName || null,
        customer_phone:  customerPhone || null,
        customer_email:  customerEmail || null,
        items:           enriched,
        subtotal,
        shipping_total:  shippingTotal,
        total,
        status:          'pending',
        source,
        notes:           notes || null,
        lead_id:         leadId,
        whatsapp_sent:   true,
      })
      .select('id, order_number')
      .single()

    if (orderErr) throw orderErr

    // ── 7. Inventory movements (for tracked products only) ────────
    const stockUpdates: PromiseLike<any>[] = []
    const movements: any[] = []

    for (const item of enriched) {
      const product = products.find(p => p.id === item.product_id)!
      if (!product.track_stock) continue

      const newQty = Math.max(0, product.stock_qty - item.qty)
      const newStatus = newQty === 0
        ? 'out_of_stock'
        : newQty <= (product.low_stock_threshold || 5)
          ? 'low_stock'
          : 'in_stock'

      stockUpdates.push(
        supabase.from('catalog_products').update({
          stock_qty: newQty,
          stock_status: newStatus,
          total_orders: (product as any).total_orders + 1,
          total_revenue: ((product as any).total_revenue || 0) + item.subtotal,
        }).eq('id', item.product_id)
      )

      movements.push({
        product_id:  item.product_id,
        variant_id:  item.variant_id || null,
        order_id:    order.id,
        type:        'sale',
        qty_change:  -item.qty,
        qty_before:  product.stock_qty,
        qty_after:   newQty,
        notes:       `Venta catálogo — ${order.order_number}`,
        created_by:  'website',
      })
    }

    // ── 8. Lead ↔ product relations ───────────────────────────────
    const leadRelations = leadId ? enriched.map(item => ({
      lead_id:      leadId,
      product_id:   item.product_id,
      variant_id:   item.variant_id || null,
      order_id:     order.id,
      product_name: item.name,
      variant_name: item.variant_name || null,
      qty:          item.qty,
      unit_price:   item.unit_price,
      notes:        `Pedido ${order.order_number}`,
    })) : []

    await Promise.all([
      ...stockUpdates,
      movements.length ? supabase.from('inventory_movements').insert(movements) : Promise.resolve(),
      leadRelations.length ? supabase.from('lead_product_relations').insert(leadRelations) : Promise.resolve(),
    ])

    // ── 9. Admin email notification (non-blocking) ────────────────
    notifyAdmin({ orderNumber: order.order_number, customerName, customerPhone, customerEmail, items: enriched, total })
      .catch(console.error)

    return ok({
      ok: true,
      order_number: order.order_number,
      order_id:     order.id,
      lead_id:      leadId,
      total,
    })

  } catch (e: any) {
    console.error('[Catalog Orders] Error:', e)
    return err(e.message || 'Error interno', 500)
  }
}

// ─── GET: orders list ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url    = new URL(req.url)
  const status = url.searchParams.get('status')
  const limit  = parseInt(url.searchParams.get('limit') || '50')

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase.from('catalog_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return err(error.message, 500)
  return ok({ ok: true, orders: data })
}

// ─── EMAIL NOTIFICATION ───────────────────────────────────────────
async function notifyAdmin(order: {
  orderNumber: string; customerName: string; customerPhone: string
  customerEmail: string; items: any[]; total: number
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  })

  const rows = order.items.map(i => `
    <tr>
      <td style="padding:10px 14px;font-size:13px;color:#0f172a">
        ${i.name}${i.variant_name ? `<br><span style="font-size:11px;color:#64748b">${i.variant_name}</span>` : ''}
      </td>
      <td style="padding:10px 14px;font-size:13px;text-align:center">${i.qty}</td>
      <td style="padding:10px 14px;font-size:13px;text-align:right">$${i.unit_price.toFixed(2)}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;text-align:right">$${i.subtotal.toFixed(2)}</td>
    </tr>`).join('')

  await transporter.sendMail({
    from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `🛒 Nuevo pedido ${order.orderNumber} — $${order.total.toFixed(2)} USD`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:'Helvetica Neue',sans-serif">
<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
  <div style="background:#00113a;padding:20px 28px;text-align:center">
    <h2 style="color:#fff;font-size:18px;font-weight:800;margin:0">Nuevo Pedido de Catálogo</h2>
    <p style="color:#b3c5ff;font-size:14px;margin:6px 0 0">${order.orderNumber}</p>
  </div>
  <div style="background:#2552ca;padding:10px 28px;text-align:center">
    <p style="color:#fff;font-size:12px;font-weight:700;margin:0;letter-spacing:1px;text-transform:uppercase">Requiere confirmación por WhatsApp</p>
  </div>
  <div style="padding:24px 28px">
    <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Cliente</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a">${order.customerName||'No especificado'}</p>
      ${order.customerPhone ? `<p style="margin:3px 0 0;font-size:13px;color:#64748b">📞 ${order.customerPhone}</p>` : ''}
      ${order.customerEmail ? `<p style="margin:3px 0 0;font-size:13px;color:#64748b">✉️ ${order.customerEmail}</p>` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Producto</th>
        <th style="padding:9px 14px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Cant.</th>
        <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">P. Unit.</th>
        <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Subtotal</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="border-top:2px solid #f1f5f9;padding-top:14px;text-align:right">
      <span style="font-size:13px;color:#64748b">Total</span><br>
      <span style="font-size:26px;font-weight:800;color:#00113a">$${order.total.toFixed(2)} USD</span>
    </div>
  </div>
  <div style="background:#00113a;padding:18px 28px;text-align:center">
    <a href="${process.env.NEXT_PUBLIC_SITE_URL||'https://artiaagency.vercel.app'}/admin/catalogo"
      style="display:inline-block;padding:10px 22px;background:#2552ca;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px">
      Ver en el CRM →
    </a>
  </div>
</div>
</body></html>`,
  })
}