import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SYSTEM_PROMPT = `Eres el asistente de CRM de Artia Studio. Conviertes preguntas en lenguaje natural en consultas a la base de datos.

TABLAS DISPONIBLES:
- leads: id, folio, nombre, email, telefono, servicio, estado, notes, estimated_value, final_value, payment_status, created_at
  estados: nuevo, contactado, en_proceso, cerrado, perdido
  payment_status: pendiente, parcial, pagado
- payments: id, lead_id, amount, status, method, description, fecha
  status: pagado, pendiente, cancelado
- projects: id, lead_id, name, access_code, status, event_date, created_at
  status: activo, entregado, archivado

IMPORTANTE: Supabase JS no soporta sum() en select. Para calcular totales debes traer todos los registros y sumarlos en código.

Responde SOLO con un JSON sin backticks, sin texto extra. Formato exacto:
{
  "intent": "list" | "count" | "sum_amount",
  "table": "leads" | "payments" | "projects",
  "select": "id, nombre, email, estado, payment_status, estimated_value",
  "filters": [
    {"column": "estado", "operator": "eq", "value": "cerrado"},
    {"column": "payment_status", "operator": "neq", "value": "pagado"}
  ],
  "order": {"column": "created_at", "ascending": false},
  "limit": 50,
  "sum_field": "amount",
  "answer_prefix": "Encontré"
}

Ejemplos:
- "clientes que no han pagado" → leads cerrados con payment_status != pagado
- "cuánto hemos facturado" → intent: sum_amount, table: payments, filters: [{status eq pagado}]
- "leads cerrados este mes" → leads estado cerrado + created_at >= primer día del mes
- "proyectos activos" → projects status = activo`

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query requerida' }, { status: 400 })

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ answer: 'IA no configurada (GROQ_API_KEY faltante).', rows: [] })
  }

  try {
    // 1. Groq genera el plan
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    })

    if (!groqRes.ok) throw new Error(`Groq error: ${groqRes.status}`)
    const groqData   = await groqRes.json()
    const rawContent = groqData.choices?.[0]?.message?.content ?? ''

    let plan: any
    try {
      plan = JSON.parse(rawContent.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ answer: 'No pude interpretar esa consulta. Intenta ser más específico, como: "leads cerrados" o "pagos de este mes".', rows: [] })
    }

    // 2. Ejecutar query
    const { table, select, filters = [], order, limit = 100 } = plan

    let q = supabase.from(table).select(select ?? '*')

    for (const f of filters) {
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

    if (order) q = q.order(order.column, { ascending: order.ascending ?? false })
    q = q.limit(limit)

    const { data: rows, error } = await q

    if (error) {
      console.error('Supabase IA query error:', error)
      return NextResponse.json({ answer: `Error en la base de datos: ${error.message}`, rows: [] })
    }

    const resultRows = rows ?? []

    // 3. Calcular respuesta según intent
    let answer: string

    if (plan.intent === 'sum_amount' && plan.sum_field) {
      const total = resultRows.reduce((s: number, r: any) => s + (r[plan.sum_field] ?? 0), 0)
      const fmt   = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(total)
      answer = `El total es **${fmt}** (${resultRows.length} registros).`
    } else if (plan.intent === 'count') {
      answer = `Hay **${resultRows.length}** ${table} que cumplen esa condición.`
    } else {
      const prefix = plan.answer_prefix ?? 'Resultados'
      answer = `${prefix}: **${resultRows.length}** registro${resultRows.length !== 1 ? 's' : ''}.`
      if (resultRows.length === 0) answer = 'No encontré resultados para esa consulta.'
    }

    return NextResponse.json({ answer, rows: resultRows, count: resultRows.length })

  } catch (err: any) {
    console.error('IA CRM error:', err)
    return NextResponse.json({ answer: `Error: ${err.message}`, rows: [] }, { status: 500 })
  }
}