import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Columnas válidas por tabla ──
const VALID_COLUMNS: Record<string, string[]> = {
  leads: ['id', 'folio', 'nombre', 'email', 'telefono', 'servicio', 'estado', 'notes', 'notas_internas', 'estimated_value', 'final_value', 'payment_status', 'created_at'],
  payment_parents: ['id', 'lead_id', 'contract_value', 'description', 'payment_month', 'status', 'created_at'],
  payment_installments: ['id', 'parent_id', 'amount', 'payment_date', 'status', 'payment_method', 'receipt_url', 'payment_number', 'created_at'],
}

// ── Tipos para el nuevo modelo ──
type Installment = {
  id?: string
  amount: number
  payment_date: string
  status: 'pagado' | 'pendiente' | 'vencido'
  payment_method?: string
  receipt_url?: string | null
  payment_number: number
}

type PaymentParent = {
  id: string
  lead_id: string
  contract_value: number
  description: string | null
  payment_month: string | null
  status: string
  created_at: string
  installments: Installment[]
  lead: {
    nombre: string
    folio: string | null
    servicio: string | null
    estimated_value: number | null
    contract_value: number | null
  } | null
}

// ── Helpers ──
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) => {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Detectar intent directamente sin IA ──
function detectDirectIntent(query: string): any | null {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Total facturado (suma de contract_value en payment_parents)
  if (/(cuanto|total|facturado|contratado|valor total)/.test(q) && /(contrato|factura|total|valor)/.test(q)) {
    return {
      intent: 'aggregate_parents',
      table: 'payment_parents',
      select: 'id, contract_value, lead_id, description, payment_month, status, created_at',
      filters: [],
      sum_field: 'contract_value',
      answer_prefix: 'Total facturado en contratos',
      detail_table: 'payment_parents',
    }
  }

  // Total pagado (suma de installments con status='pagado')
  if (/(cuanto|total|pagado|cobrado|ingreso|recaudado)/.test(q) && /(pagado|cobrado|recaudado)/.test(q)) {
    return {
      intent: 'aggregate_installments',
      table: 'payment_installments',
      select: 'id, amount, status, payment_date, payment_method, parent_id',
      filters: [{ column: 'status', operator: 'eq', value: 'pagado' }],
      sum_field: 'amount',
      answer_prefix: 'Total pagado',
      detail_table: 'payment_installments',
    }
  }

  // Pendiente por cobrar
  if (/(pendiente|por cobrar|sin pagar|faltante)/.test(q) && /(pago|cobro|monto|cuota)/.test(q)) {
    return {
      intent: 'aggregate_installments',
      table: 'payment_installments',
      select: 'id, amount, status, payment_date, parent_id',
      filters: [{ column: 'status', operator: 'eq', value: 'pendiente' }],
      sum_field: 'amount',
      answer_prefix: 'Total pendiente por cobrar',
      detail_table: 'payment_installments',
    }
  }

  // Vencido
  if (/(vencido|atrasado|mora)/.test(q)) {
    return {
      intent: 'aggregate_installments',
      table: 'payment_installments',
      select: 'id, amount, status, payment_date, parent_id',
      filters: [{ column: 'status', operator: 'eq', value: 'vencido' }],
      sum_field: 'amount',
      answer_prefix: 'Total vencido',
      detail_table: 'payment_installments',
    }
  }

  // Clientes que no han pagado (leads con contratos pero sin todas las cuotas pagadas)
  if (/(cliente|lead).*(no.*pag|sin pag|pendiente)/.test(q) || /(no.*pag|sin pag).*(cliente|lead)/.test(q)) {
    return {
      intent: 'unpaid_clients',
      table: 'payment_parents',
      select: 'id, lead_id, contract_value, description, payment_month, status, created_at',
      filters: [],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Clientes con pagos pendientes',
    }
  }

  // Contratos activos
  if (/(contrato|proyecto).*(activo|abierto)/.test(q) || /activo.*(contrato|proyecto)/.test(q)) {
    return {
      intent: 'list_parents',
      table: 'payment_parents',
      select: 'id, lead_id, contract_value, description, payment_month, status, created_at',
      filters: [{ column: 'status', operator: 'eq', value: 'activo' }],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Contratos activos',
    }
  }

  // Contratos completados
  if (/(contrato|proyecto).*(completado|terminado|pagado|cerrado)/.test(q)) {
    return {
      intent: 'list_parents',
      table: 'payment_parents',
      select: 'id, lead_id, contract_value, description, payment_month, status, created_at',
      filters: [],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Contratos',
      post_filter: 'completed',
    }
  }

  // Leads cerrados
  if (/(lead|cliente).*(cerrado)/.test(q) || /cerrado.*(lead|cliente)/.test(q)) {
    return {
      intent: 'list',
      table: 'leads',
      select: 'id, folio, nombre, servicio, estado, payment_status, estimated_value, created_at',
      filters: [{ column: 'estado', operator: 'eq', value: 'cerrado' }],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Leads cerrados',
    }
  }

  // Leads perdidos
  if (/(perdido|cancelado)/.test(q)) {
    return {
      intent: 'list',
      table: 'leads',
      select: 'id, folio, nombre, servicio, estado, created_at',
      filters: [{ column: 'estado', operator: 'eq', value: 'perdido' }],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Leads perdidos',
    }
  }

  // Leads este mes
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  if (/(este mes|mes actual|mes)/.test(q) && /(lead|cliente)/.test(q)) {
    return {
      intent: 'list',
      table: 'leads',
      select: 'id, folio, nombre, servicio, estado, created_at',
      filters: [{ column: 'created_at', operator: 'gte', value: inicioMes }],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Leads de este mes',
    }
  }

  // Leads en proceso con mayor valor
  if (/(en proceso|proceso)/.test(q) && /(mayor|valor|alto)/.test(q)) {
    return {
      intent: 'list',
      table: 'leads',
      select: 'id, folio, nombre, servicio, estado, estimated_value',
      filters: [{ column: 'estado', operator: 'eq', value: 'en_proceso' }],
      order: { column: 'estimated_value', ascending: false },
      limit: 20,
      answer_prefix: 'Leads en proceso por valor',
    }
  }

  return null
}

// ── Sanitizar plan de Groq ──
function sanitizePlan(plan: any): any {
  const table = plan.table
  const validCols = VALID_COLUMNS[table] ?? []

  let selectCols: string[] = (plan.select ?? 'id')
    .split(',')
    .map((c: string) => c.trim())
    .filter((c: string) => validCols.includes(c) || c === '*')

  if (selectCols.length === 0) {
    selectCols = table === 'payment_parents'
      ? ['id', 'lead_id', 'contract_value', 'description', 'payment_month', 'status', 'created_at']
      : table === 'payment_installments'
      ? ['id', 'parent_id', 'amount', 'status', 'payment_date', 'payment_method', 'payment_number']
      : ['id', 'folio', 'nombre', 'email', 'servicio', 'estado', 'payment_status', 'estimated_value']
  }

  const filters = (plan.filters ?? []).filter((f: any) => validCols.includes(f.column))

  return {
    ...plan,
    select: selectCols.join(', '),
    filters,
    sum_field: plan.sum_field && validCols.includes(plan.sum_field) ? plan.sum_field : 'amount',
  }
}

const SYSTEM_PROMPT = `Eres el asistente de CRM de Artia Studio. Conviertes preguntas en un plan de consulta JSON.

TABLAS Y COLUMNAS EXACTAS (usa SOLO estas):
- leads: id, folio, nombre, email, telefono, servicio, estado, notes, estimated_value, final_value, payment_status, created_at
  estados válidos: nuevo, contactado, en_proceso, cerrado, perdido
  payment_status válidos: pendiente, parcial, pagado

- payment_parents (contratos): id, lead_id, contract_value, description, payment_month, status, created_at
  status válidos: activo, completado, cancelado
  contract_value = valor TOTAL del contrato

- payment_installments (cuotas): id, parent_id, amount, payment_date, status, payment_method, receipt_url, payment_number, created_at
  status válidos: pagado, pendiente, vencido
  amount = monto de UNA cuota
  parent_id → payment_parents.id

REGLAS CRÍTICAS:
1. En "select" usa SOLO columnas de la tabla elegida, separadas por coma
2. NUNCA uses sum(), count() u otras funciones en select
3. Para totales de contratos usa intent="aggregate_parents" con sum_field="contract_value"
4. Para totales de cuotas pagadas/pendientes usa intent="aggregate_installments" con sum_field="amount"
5. Responde ÚNICAMENTE el JSON, sin explicaciones ni backticks

Formato de respuesta:
{"intent":"aggregate_parents","table":"payment_parents","select":"id, contract_value, lead_id, description, status","filters":[],"sum_field":"contract_value","answer_prefix":"Total facturado"}`

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query requerida' }, { status: 400 })

  // 1. Intentar detectar directamente sin IA
  const directPlan = detectDirectIntent(query)
  if (directPlan) {
    return executePlan(supabase, directPlan)
  }

  // 2. Si no detectamos, usar Groq
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      answer: 'No pude interpretar esa consulta. Intenta: "cuánto hemos facturado", "clientes sin pagar", "contratos activos", "cuotas pendientes".',
      rows: [],
    })
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0.05,
        max_tokens: 400,
      }),
    })

    if (!groqRes.ok) throw new Error(`Groq ${groqRes.status}`)
    const groqData = await groqRes.json()
    const rawContent = groqData.choices?.[0]?.message?.content ?? ''

    let plan: any
    try {
      const match = rawContent.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found')
      plan = JSON.parse(match[0])
    } catch {
      return NextResponse.json({
        answer: 'No entendí esa consulta. Prueba: "cuánto hemos cobrado", "contratos sin pagar", "cuotas vencidas".',
        rows: [],
      })
    }

    const safePlan = sanitizePlan(plan)
    return executePlan(supabase, safePlan)

  } catch (err: any) {
    console.error('IA CRM error:', err)
    return NextResponse.json({ answer: `Error de conexión: ${err.message}`, rows: [] }, { status: 500 })
  }
}

// ── Ejecutar plan ──
async function executePlan(supabase: any, plan: any): Promise<NextResponse> {
  const { table, select, filters = [], order, limit = 100 } = plan

  if (!VALID_COLUMNS[table]) {
    return NextResponse.json({ answer: `Tabla "${table}" no válida.`, rows: [] })
  }

  // ── CASO ESPECIAL: aggregate_parents (suma de contract_value) ──
  if (plan.intent === 'aggregate_parents') {
    let q = supabase.from('payment_parents').select(`
      id, contract_value, lead_id, description, payment_month, status, created_at,
      lead:lead_id (nombre, folio, servicio)
    `)

    for (const f of filters) {
      if (!f.column || !f.operator) continue
      switch (f.operator) {
        case 'eq': q = q.eq(f.column, f.value); break
        case 'neq': q = q.neq(f.column, f.value); break
        case 'gt': q = q.gt(f.column, f.value); break
        case 'gte': q = q.gte(f.column, f.value); break
        case 'lt': q = q.lt(f.column, f.value); break
        case 'lte': q = q.lte(f.column, f.value); break
        case 'ilike': q = q.ilike(f.column, `%${f.value}%`); break
        case 'in': q = q.in(f.column, f.value); break
        case 'is': q = q.is(f.column, f.value); break
      }
    }

    if (order?.column) q = q.order(order.column, { ascending: order.ascending ?? false })
    q = q.limit(Math.min(limit ?? 100, 200))

    const { data: rows, error } = await q
    if (error) return NextResponse.json({ answer: `Error: ${error.message}`, rows: [] })

    const total = (rows ?? []).reduce((s: number, r: any) => s + (Number(r.contract_value) || 0), 0)
    
    // Enriquecer filas con links navegables
    const enrichedRows = (rows ?? []).map((r: any) => ({
      ...r,
      _navigateTo: r.lead?.folio ? `/dashboard/finanzas?folio=${r.lead.folio}` : null,
      _entityType: 'contrato',
      _displayName: r.lead?.nombre ?? 'Sin cliente',
      _folio: r.lead?.folio ?? null,
    }))

    return NextResponse.json({
      answer: `**${plan.answer_prefix ?? 'Total'}:** ${fmtMoney(total)} (${enrichedRows.length} contratos)`,
      rows: enrichedRows,
      count: enrichedRows.length,
      meta: { total, currency: 'USD', entity: 'payment_parents' }
    })
  }

  // ── CASO ESPECIAL: aggregate_installments (suma de cuotas) ──
  if (plan.intent === 'aggregate_installments') {
    let q = supabase.from('payment_installments').select(`
      id, amount, status, payment_date, payment_method, payment_number, parent_id,
      parent:parent_id (id, contract_value, description, payment_month, lead_id, lead:lead_id (nombre, folio, servicio))
    `)

    for (const f of filters) {
      if (!f.column || !f.operator) continue
      switch (f.operator) {
        case 'eq': q = q.eq(f.column, f.value); break
        case 'neq': q = q.neq(f.column, f.value); break
        case 'gt': q = q.gt(f.column, f.value); break
        case 'gte': q = q.gte(f.column, f.value); break
        case 'lt': q = q.lt(f.column, f.value); break
        case 'lte': q = q.lte(f.column, f.value); break
        case 'ilike': q = q.ilike(f.column, `%${f.value}%`); break
        case 'in': q = q.in(f.column, f.value); break
        case 'is': q = q.is(f.column, f.value); break
      }
    }

    if (order?.column) q = q.order(order.column, { ascending: order.ascending ?? false })
    q = q.limit(Math.min(limit ?? 100, 200))

    const { data: rows, error } = await q
    if (error) return NextResponse.json({ answer: `Error: ${error.message}`, rows: [] })

    const field = plan.sum_field ?? 'amount'
    const total = (rows ?? []).reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0)

    const enrichedRows = (rows ?? []).map((r: any) => ({
      ...r,
      _navigateTo: r.parent?.lead?.folio ? `/dashboard/finanzas?folio=${r.parent.lead.folio}` : null,
      _entityType: 'cuota',
      _displayName: r.parent?.lead?.nombre ?? 'Sin cliente',
      _folio: r.parent?.lead?.folio ?? null,
      _parentContract: r.parent?.contract_value ?? null,
    }))

    return NextResponse.json({
      answer: `**${plan.answer_prefix ?? 'Total'}:** ${fmtMoney(total)} (${enrichedRows.length} cuotas)`,
      rows: enrichedRows,
      count: enrichedRows.length,
      meta: { total, currency: 'USD', entity: 'payment_installments' }
    })
  }

  // ── CASO ESPECIAL: unpaid_clients ──
  if (plan.intent === 'unpaid_clients') {
    const { data: parents, error } = await supabase
      .from('payment_parents')
      .select(`
        id, lead_id, contract_value, description, payment_month, status, created_at,
        installments:payment_installments (id, amount, status),
        lead:lead_id (nombre, folio, servicio)
      `)
      .limit(200)

    if (error) return NextResponse.json({ answer: `Error: ${error.message}`, rows: [] })

    // Filtrar: contratos donde NO todas las cuotas estén pagadas
    const unpaid = (parents ?? []).filter((p: any) => {
      if (!p.installments || p.installments.length === 0) return true
      return !p.installments.every((i: any) => i.status === 'pagado')
    })

    const enrichedRows = unpaid.map((r: any) => {
      const pagado = r.installments?.filter((i: any) => i.status === 'pagado').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0) ?? 0
      const pendiente = (r.contract_value || 0) - pagado
      
      return {
        ...r,
        _navigateTo: r.lead?.folio ? `/dashboard/finanzas?folio=${r.lead.folio}` : null,
        _entityType: 'cliente_pendiente',
        _displayName: r.lead?.nombre ?? 'Sin cliente',
        _folio: r.lead?.folio ?? null,
        _pagado: pagado,
        _pendiente: pendiente,
        _progress: r.contract_value > 0 ? Math.round((pagado / r.contract_value) * 100) : 0,
      }
    })

    return NextResponse.json({
      answer: `**${plan.answer_prefix ?? 'Clientes con pagos pendientes'}:** ${enrichedRows.length} cliente${enrichedRows.length !== 1 ? 's' : ''}`,
      rows: enrichedRows,
      count: enrichedRows.length,
      meta: { entity: 'unpaid_clients' }
    })
  }

  // ── CASO ESPECIAL: list_parents (contratos con cuotas) ──
  if (plan.intent === 'list_parents') {
    let q = supabase.from('payment_parents').select(`
      id, lead_id, contract_value, description, payment_month, status, created_at,
      installments:payment_installments (id, amount, status, payment_date, payment_number),
      lead:lead_id (nombre, folio, servicio)
    `)

    for (const f of filters) {
      if (!f.column || !f.operator) continue
      switch (f.operator) {
        case 'eq': q = q.eq(f.column, f.value); break
        case 'neq': q = q.neq(f.column, f.value); break
        case 'gt': q = q.gt(f.column, f.value); break
        case 'gte': q = q.gte(f.column, f.value); break
        case 'lt': q = q.lt(f.column, f.value); break
        case 'lte': q = q.lte(f.column, f.value); break
        case 'ilike': q = q.ilike(f.column, `%${f.value}%`); break
        case 'in': q = q.in(f.column, f.value); break
        case 'is': q = q.is(f.column, f.value); break
      }
    }

    if (order?.column) q = q.order(order.column, { ascending: order.ascending ?? false })
    q = q.limit(Math.min(limit ?? 100, 200))

    const { data: rows, error } = await q
    if (error) return NextResponse.json({ answer: `Error: ${error.message}`, rows: [] })

    let resultRows = rows ?? []
    
    // Post-filter para completados
    if (plan.post_filter === 'completed') {
      resultRows = resultRows.filter((r: any) => 
        r.installments?.length > 0 && r.installments.every((i: any) => i.status === 'pagado')
      )
    }

    const enrichedRows = resultRows.map((r: any) => {
      const pagado = r.installments?.filter((i: any) => i.status === 'pagado').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0) ?? 0
      return {
        ...r,
        _navigateTo: r.lead?.folio ? `/dashboard/finanzas?folio=${r.lead.folio}` : null,
        _entityType: 'contrato',
        _displayName: r.lead?.nombre ?? 'Sin cliente',
        _folio: r.lead?.folio ?? null,
        _pagado: pagado,
        _pendiente: (r.contract_value || 0) - pagado,
        _progress: r.contract_value > 0 ? Math.round((pagado / r.contract_value) * 100) : 0,
      }
    })

    return NextResponse.json({
      answer: `**${plan.answer_prefix ?? 'Contratos'}:** ${enrichedRows.length} registro${enrichedRows.length !== 1 ? 's' : ''}`,
      rows: enrichedRows,
      count: enrichedRows.length,
      meta: { entity: 'payment_parents' }
    })
  }

  // ── CASO GENÉRICO: list (leads u otras tablas simples) ──
  let q = supabase.from(table).select(select ?? '*')

  for (const f of filters) {
    if (!f.column || !f.operator) continue
    switch (f.operator) {
      case 'eq': q = q.eq(f.column, f.value); break
      case 'neq': q = q.neq(f.column, f.value); break
      case 'gt': q = q.gt(f.column, f.value); break
      case 'gte': q = q.gte(f.column, f.value); break
      case 'lt': q = q.lt(f.column, f.value); break
      case 'lte': q = q.lte(f.column, f.value); break
      case 'ilike': q = q.ilike(f.column, `%${f.value}%`); break
      case 'in': q = q.in(f.column, f.value); break
      case 'is': q = q.is(f.column, f.value); break
    }
  }

  if (order?.column && VALID_COLUMNS[table]?.includes(order.column)) {
    q = q.order(order.column, { ascending: order.ascending ?? false })
  }

  q = q.limit(Math.min(limit ?? 100, 200))

  const { data: rows, error } = await q

  if (error) {
    console.error('Supabase IA error:', error)
    return NextResponse.json({ answer: `Error en base de datos: ${error.message}`, rows: [] })
  }

  const resultRows = (rows ?? []).map((r: any) => ({
    ...r,
    _navigateTo: r.folio ? `/dashboard/finanzas?folio=${r.folio}` : null,
    _entityType: table === 'leads' ? 'lead' : 'registro',
    _displayName: r.nombre ?? r.description ?? 'Sin nombre',
    _folio: r.folio ?? null,
  }))

  const answer = resultRows.length === 0
    ? 'No encontré resultados para esa consulta.'
    : `**${plan.answer_prefix ?? 'Resultados'}:** ${resultRows.length} registro${resultRows.length !== 1 ? 's' : ''}`

  return NextResponse.json({ answer, rows: resultRows, count: resultRows.length })
}