import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Columnas válidas por tabla ── evita que Groq invente columnas
const VALID_COLUMNS: Record<string, string[]> = {
  leads:    ['id', 'folio', 'nombre', 'email', 'telefono', 'servicio', 'estado', 'notes', 'notas_internas', 'estimated_value', 'final_value', 'payment_status', 'created_at'],
  payments: ['id', 'lead_id', 'amount', 'status', 'method', 'description', 'fecha', 'created_at'],
  projects: ['id', 'lead_id', 'name', 'access_code', 'status', 'event_date', 'created_at'],
}

// ── Detectar intent directamente sin IA para queries comunes ──────────────
function detectDirectIntent(query: string): any | null {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Total facturado / cobrado
  if (/(cuanto|total|facturado|cobrado|ingreso|revenue)/.test(q) && /(factura|cobra|ingreso|total|hemo)/.test(q)) {
    return {
      intent: 'sum_amount', table: 'payments',
      select: 'id, amount, status, fecha',
      filters: [{ column: 'status', operator: 'eq', value: 'pagado' }],
      sum_field: 'amount',
      answer_prefix: 'Total facturado',
    }
  }

  // Pagos pendientes
  if (/(pendiente|por cobrar|sin pagar)/.test(q) && /(pago|cobro|monto)/.test(q)) {
    return {
      intent: 'sum_amount', table: 'payments',
      select: 'id, amount, status, fecha',
      filters: [{ column: 'status', operator: 'eq', value: 'pendiente' }],
      sum_field: 'amount',
      answer_prefix: 'Total pendiente por cobrar',
    }
  }

  // Clientes que no han pagado
  if (/(cliente|lead).*(no.*pag|sin pag|pendiente)/.test(q) || /(no.*pag|sin pag).*(cliente|lead)/.test(q)) {
    return {
      intent: 'list', table: 'leads',
      select: 'id, folio, nombre, email, servicio, estado, payment_status, estimated_value',
      filters: [
        { column: 'payment_status', operator: 'neq', value: 'pagado' },
        { column: 'estado', operator: 'eq', value: 'cerrado' },
      ],
      order: { column: 'nombre', ascending: true },
      limit: 50,
      answer_prefix: 'Clientes cerrados sin pago completo',
    }
  }

  // Leads cerrados
  if (/(lead|cliente).*(cerrado)/.test(q) || /cerrado.*(lead|cliente)/.test(q)) {
    return {
      intent: 'list', table: 'leads',
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
      intent: 'list', table: 'leads',
      select: 'id, folio, nombre, servicio, estado, created_at',
      filters: [{ column: 'estado', operator: 'eq', value: 'perdido' }],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Leads perdidos',
    }
  }

  // Proyectos activos
  if (/(proyecto).*(activo)/.test(q) || /activo.*(proyecto)/.test(q)) {
    return {
      intent: 'list', table: 'projects',
      select: 'id, name, access_code, status, event_date, created_at',
      filters: [{ column: 'status', operator: 'eq', value: 'activo' }],
      order: { column: 'created_at', ascending: false },
      limit: 50,
      answer_prefix: 'Proyectos activos',
    }
  }

  // Leads este mes
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  if (/(este mes|mes actual|mes)/.test(q) && /(lead|cliente)/.test(q)) {
    return {
      intent: 'list', table: 'leads',
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
      intent: 'list', table: 'leads',
      select: 'id, folio, nombre, servicio, estado, estimated_value',
      filters: [{ column: 'estado', operator: 'eq', value: 'en_proceso' }],
      order: { column: 'estimated_value', ascending: false },
      limit: 20,
      answer_prefix: 'Leads en proceso por valor',
    }
  }

  return null
}

// ── Validar y sanitizar el plan de Groq ──────────────────────────────────
function sanitizePlan(plan: any): any {
  const table = plan.table
  const validCols = VALID_COLUMNS[table] ?? []

  // Sanitizar select: eliminar columnas inválidas, agregar columnas básicas
  let selectCols: string[] = (plan.select ?? 'id, nombre')
    .split(',')
    .map((c: string) => c.trim())
    .filter((c: string) => validCols.includes(c) || c === '*')

  // Si quedó vacío o solo tiene inválidos, usar select básico según tabla
  if (selectCols.length === 0) {
    selectCols = table === 'payments'
      ? ['id', 'amount', 'status', 'fecha', 'method', 'description']
      : table === 'projects'
      ? ['id', 'name', 'access_code', 'status', 'created_at']
      : ['id', 'folio', 'nombre', 'email', 'servicio', 'estado', 'payment_status', 'estimated_value']
  }

  // Sanitizar filtros: solo columnas válidas
  const filters = (plan.filters ?? []).filter((f: any) => validCols.includes(f.column))

  // Si intent es sum_amount, asegurar que amount esté en select
  if (plan.intent === 'sum_amount' && !selectCols.includes('amount')) {
    selectCols.push('amount')
  }

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
- payments: id, lead_id, amount, status, method, description, fecha, created_at
  status válidos: pagado, pendiente, cancelado
- projects: id, lead_id, name, access_code, status, event_date, created_at
  status válidos: activo, entregado, archivado

REGLAS CRÍTICAS:
1. En "select" usa SOLO columnas de la tabla elegida, separadas por coma
2. NUNCA uses sum(), count() u otras funciones en select
3. Para totales usa intent="sum_amount" con sum_field="amount"
4. Responde ÚNICAMENTE el JSON, sin explicaciones ni backticks

Formato de respuesta:
{"intent":"list","table":"payments","select":"id, amount, status, fecha","filters":[{"column":"status","operator":"eq","value":"pagado"}],"order":{"column":"fecha","ascending":false},"limit":100,"sum_field":"amount","answer_prefix":"Resultados"}`

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query requerida' }, { status: 400 })

  // 1. Intentar detectar directamente sin IA
  const directPlan = detectDirectIntent(query)
  if (directPlan) {
    return executePlan(supabase, directPlan)
  }

  // 2. Si no detectamos directamente, usar Groq
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      answer: 'No pude interpretar esa consulta. Intenta: "cuánto hemos facturado", "clientes sin pagar", "leads cerrados", "proyectos activos".',
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
    const groqData   = await groqRes.json()
    const rawContent = groqData.choices?.[0]?.message?.content ?? ''

    let plan: any
    try {
      // Extraer JSON aunque venga con texto
      const match = rawContent.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found')
      plan = JSON.parse(match[0])
    } catch {
      return NextResponse.json({
        answer: 'No entendí esa consulta. Prueba: "cuánto hemos cobrado", "leads sin pagar", "proyectos activos".',
        rows: [],
      })
    }

    // Sanitizar el plan para evitar columnas inventadas
    const safePlan = sanitizePlan(plan)
    return executePlan(supabase, safePlan)

  } catch (err: any) {
    console.error('IA CRM error:', err)
    return NextResponse.json({ answer: `Error de conexión: ${err.message}`, rows: [] }, { status: 500 })
  }
}

async function executePlan(supabase: any, plan: any): Promise<NextResponse> {
  const { table, select, filters = [], order, limit = 100 } = plan

  if (!VALID_COLUMNS[table]) {
    return NextResponse.json({ answer: `Tabla "${table}" no válida.`, rows: [] })
  }

  let q = supabase.from(table).select(select ?? '*')

  for (const f of filters) {
    if (!f.column || !f.operator) continue
    switch (f.operator) {
      case 'eq':    q = q.eq(f.column, f.value); break
      case 'neq':   q = q.neq(f.column, f.value); break
      case 'gt':    q = q.gt(f.column, f.value); break
      case 'gte':   q = q.gte(f.column, f.value); break
      case 'lt':    q = q.lt(f.column, f.value); break
      case 'lte':   q = q.lte(f.column, f.value); break
      case 'ilike': q = q.ilike(f.column, `%${f.value}%`); break
      case 'in':    q = q.in(f.column, f.value); break
      case 'is':    q = q.is(f.column, f.value); break
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

  const resultRows = rows ?? []
  const fmt = (n: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  let answer: string
  if (plan.intent === 'sum_amount') {
    const field = plan.sum_field ?? 'amount'
    const total = resultRows.reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0)
    answer = `**${plan.answer_prefix ?? 'Total'}:** ${fmt(total)} (${resultRows.length} registros)`
  } else if (plan.intent === 'count') {
    answer = `**${plan.answer_prefix ?? 'Total'}:** ${resultRows.length} registro${resultRows.length !== 1 ? 's' : ''}`
  } else {
    if (resultRows.length === 0) {
      answer = 'No encontré resultados para esa consulta.'
    } else {
      answer = `**${plan.answer_prefix ?? 'Resultados'}:** ${resultRows.length} registro${resultRows.length !== 1 ? 's' : ''}`
    }
  }

  return NextResponse.json({ answer, rows: resultRows, count: resultRows.length })
}