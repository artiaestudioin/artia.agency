// app/api/admin/export/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { type, landing_id, format } = await request.json()

  if (type === 'leads_csv') {
    const { data: orders } = await supabase
      .from('landing_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (landing_id) {
      const filtered = (orders || []).filter((o: any) => o.landing_id === landing_id)
      return exportCSV(filtered, 'landing_leads')
    }

    return exportCSV(orders || [], 'all_leads')
  }

  if (type === 'landing_html') {
    const { data: landing } = await supabase
      .from('landings')
      .select('*')
      .eq('id', landing_id)
      .single()

    if (!landing) {
      return NextResponse.json({ error: 'Landing not found' }, { status: 404 })
    }

    const html = generateStandaloneHTML(landing)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${landing.slug}.html"`,
      },
    })
  }

  if (type === 'analytics_pdf') {
    const { data: stats } = await supabase.from('landing_stats').select('*')
    const { data: events } = await supabase
      .from('landing_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    return NextResponse.json({
      stats,
      events,
      generated_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
}

function exportCSV(data: any[], filename: string) {
  if (data.length === 0) {
    return NextResponse.json({ error: 'No data to export' }, { status: 400 })
  }

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]

  // FIX: usar '\n' explícito — no salto de línea literal dentro del string
  const csv = csvRows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

function generateStandaloneHTML(landing: any): string {
  const config = landing.config

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.meta_title || config.headline}</title>
  <meta name="description" content="${config.meta_description || config.subheadline}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>* { font-family: 'Inter', sans-serif; }</style>
  ${config.custom_css ? `<style>${config.custom_css}</style>` : ''}
  ${config.pixel_id ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${config.pixel_id}');fbq('track','PageView');<\/script>` : ''}
</head>
<body class="bg-gray-50">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <h1 class="text-5xl font-black text-center mb-8">${config.headline}</h1>
    <p class="text-xl text-center text-gray-600 mb-12">${config.subheadline}</p>
  </div>
  ${config.custom_js ? `<script>${config.custom_js}<\/script>` : ''}
</body>
</html>`
}
