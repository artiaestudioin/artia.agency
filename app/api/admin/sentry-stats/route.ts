import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org   = process.env.SENTRY_ORG
  const proj  = process.env.SENTRY_PROJECT

  if (!token || !org || !proj) {
    return NextResponse.json({ error: 'missing_env', token: !!token, org: !!org, proj: !!proj })
  }

  // ✅ Diagnóstico: mostrar qué valores estamos usando (sin exponer el token)
  console.log('Sentry config:', { org, proj, tokenPrefix: token.slice(0, 10) + '...' })

  try {
    // ✅ Endpoint correcto: slugs obligatorios (no nombres)
    const url = `https://sentry.io/api/0/projects/${org}/${proj}/issues/?limit=10&query=is:unresolved`
    
    console.log('Sentry URL:', url)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Sentry API error:', res.status, text.slice(0, 500))
      
      // Diagnóstico específico para 404
      let hint = ''
      if (res.status === 404) {
        hint = `Verifica que SENTRY_ORG="${org}" y SENTRY_PROJECT="${proj}" sean los slugs exactos. 
                Org slug = subdominio de sentry.io (ej: artia-d2). 
                Project slug = último segmento de la URL del proyecto (ej: artia-agency).`
      }
      if (res.status === 401 || res.status === 403) {
        hint = 'Token inválido o sin scope event:read. Verifica en Settings > Account > API > Auth Tokens.'
      }
      
      return NextResponse.json({ 
        error: `sentry_${res.status}`, 
        detail: text.slice(0, 200),
        hint,
        debug: { org, proj } // para verificar en el cliente
      })
    }

    const issues = await res.json()
    return NextResponse.json({
      ok: true,
      unresolvedCount: Array.isArray(issues) ? issues.length : 0,
      issues: (issues as any[]).slice(0, 5).map((i: any) => ({
        id:    i.id,
        title: i.title,
        level: i.level,
        count: i.count,
        firstSeen: i.firstSeen,
      })),
    })
  } catch (err: any) {
    console.error('Sentry fetch error:', err)
    return NextResponse.json({ error: err.message })
  }
}