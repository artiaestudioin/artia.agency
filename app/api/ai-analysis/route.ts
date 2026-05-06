import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { payload } = await req.json()

  if (!payload) {
    return NextResponse.json({ error: 'Payload requerido' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are a business analyst.

Analyze the following monthly data and generate:

1. A general summary (max 100 words)
2. A separate analysis for each section:
   - Finanzas
   - Ventas
   - Leads / Clientes
   - Proyectos
   - Analíticas

Rules:
- Be concise and clear
- Focus on insights, not description
- Detect inconsistencies (totals vs payments, pending values, etc.)
- Highlight risks and opportunities
- Do NOT repeat raw data
- Professional tone

Output format:

[Resumen General]
...

[Finanzas]
...

[Ventas]
...

[Leads / Clientes]
...

[Proyectos]
...

[Analíticas]

Identify trends, inconsistencies, and risks.
Prioritize insights over raw numbers.
Respond in Spanish.`,
          },
          {
            role: 'user',
            content: `DATA:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Groq error:', data)
      return NextResponse.json({ error: data }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Handler error:', error)
    return NextResponse.json({ error: 'Error al conectar con la IA' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}