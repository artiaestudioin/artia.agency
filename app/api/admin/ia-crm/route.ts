import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SYSTEM_PROMPT = `Eres un asistente de CRM para Artia Studio. Tu función es traducir consultas en lenguaje natural a queries de la base de datos y devolver respuestas útiles.

ESQUEMA DE LA BASE DE DATOS:
- leads: id, nombre, email, telefono, servicio, estado (nuevo|contactado|en_proceso|cerrado|perdido), notes, estimated_value, final_value, payment_status (pendiente|parcial|pagado), created_at
- payments: id, lead_id, amount, status (pagado|pendiente|cancelado), method, description, fecha, created_at  
- projects: id, lead_id, name, access_code, status (activo|entregado|archivado), event_date, created_at
- project_files: id, project_id, file_url, file_name, file_type, file_size, created_at

REGLAS:
1. Analiza la consulta del usuario
2. Determina qué datos de Supabase necesitas
3. Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "table": "leads",
  "select": "id, nombre, email, servicio, estado, payment_status, estimated_value",
  "filters": [{"column": "estado", "operator": "eq", "value": "cerrado"}],
  "order": {"column": "created_at", "ascending": false},
  "limit": 50,
  "answer_template": "Encontré {count} leads cerrados. {summary}"
}

OPERADORES disponibles: eq, neq, gt, gte, lt, lte, like, ilike, in, is
Para "no han pagado": payment_status neq pagado + estado eq cerrado
Para "este mes": fecha gte primer día del mes actual (usa ISO format)
Para sumar amounts: select "sum(amount)" 

Responde SOLO el JSON sin backticks ni explicaciones adicionales.`

// ── Ejecutar query de Supabase basado en intención de la IA ───
async function executeQuery(supabase: any, queryPlan: any) {
  const { table, select, filters = [], order, limit = 50 } = queryPlan

  let query = supabase.from(table).select(select ?? '*')

  for (const f of filters) {
    const { column, operator, value } = f
    switch (operator) {
      case 'eq':    query = query.eq(column, value); break
      case 'neq':   query = query.neq(column, value); break
      case 'gt':    query = query.gt(column, value); break
      case 'gte':   query = query.gte(column, value); break
      case 'lt':    query = query.lt(column, value); break
      case 'lte':   query = query.lte(column, value); break
      case 'like':  query = query.like(column, value); break
      case 'ilike': query = query.ilike(column, value); break
      case 'in':    query = query.in(column, value); break
      case 'is':    query = query.is(column, value); break
      case 'neq_null': query = query.not(column, 'is', null); break
    }
  }

  if (order) {
    query = query.order(order.column, { ascending: order.ascending ?? false })
  }

  if (limit) query = query.limit(limit)

  return query
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { query } = await req.json()

  if (!query?.trim()) {
    return NextResponse.json({ error: 'query requerida' }, { status: 400 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
  }

  try {
    // 1. Groq analiza la consulta y devuelve el plan
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    })

    if (!groqRes.ok) {
      throw new Error('Error conectando con Groq')
    }

    const groqData   = await groqRes.json()
    const rawContent = groqData.choices?.[0]?.message?.content ?? ''

    // 2. Parsear el plan JSON
    let queryPlan: any
    try {
      const clean = rawContent.replace(/```json|```/g, '').trim()
      queryPlan   = JSON.parse(clean)
    } catch {
      // Si no se puede parsear, devolver respuesta genérica
      return NextResponse.json({
        answer: 'No pude interpretar esa consulta. Intenta ser más específico, por ejemplo: "leads cerrados que no han pagado" o "total facturado este mes".',
        rows: [],
      })
    }

    // 3. Ejecutar query en Supabase
    const { data: rows, error, count } = await executeQuery(supabase, queryPlan)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({
        answer: `Error consultando la base de datos: ${error.message}`,
        rows: [],
      })
    }

    // 4. Formatear respuesta
    const resultCount = Array.isArray(rows) ? rows.length : 0

    // Si es una consulta de suma/agregado
    let answer: string
    if (queryPlan.select?.includes('sum(') || queryPlan.select?.includes('count(')) {
      answer = `Resultado de tu consulta: ${JSON.stringify(rows?.[0] ?? {})}`
    } else if (resultCount === 0) {
      answer = 'No encontré resultados para esa consulta.'
    } else {
      const template = queryPlan.answer_template ?? 'Encontré {count} resultado(s).'
      answer = template
        .replace('{count}', String(resultCount))
        .replace('{summary}', resultCount > 0 ? `Mostrando los primeros ${Math.min(resultCount, 20)}.` : '')
    }

    return NextResponse.json({ answer, rows: rows ?? [], count: resultCount })

  } catch (err: any) {
    console.error('IA CRM error:', err)
    return NextResponse.json({
      answer: 'Error procesando tu consulta. Verifica la configuración de GROQ_API_KEY.',
      rows: [],
    }, { status: 500 })
  }
}
