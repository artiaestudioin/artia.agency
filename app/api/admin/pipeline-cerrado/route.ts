import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH — solo actualiza estado, NO crea proyectos automáticamente
// Los proyectos se crean MANUALMENTE desde Vista360 o desde Proyectos
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, estado } = await req.json()
  if (!id || !estado) return NextResponse.json({ error: 'id y estado requeridos' }, { status: 400 })

  const { error } = await supabase.from('leads').update({ estado }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// POST — crea proyecto manualmente para un lead (llamado desde Vista360 con botón explícito)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { leadId } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })

  // Verificar si ya tiene proyecto
  const { data: existing } = await supabase
    .from('projects').select('id, access_code').eq('lead_id', leadId).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, project: existing, created: false })

  // Obtener datos del lead
  const { data: lead } = await supabase
    .from('leads').select('nombre, email, servicio, folio').eq('id', leadId).single()
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

  // Generar access_code único
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let access_code = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const num    = Math.floor(Math.random() * 9000 + 1000)
    const candidate = `ASMK-${suffix}-${num}`
    const { data: conflict } = await supabase.from('projects').select('id').eq('access_code', candidate).maybeSingle()
    if (!conflict) { access_code = candidate; break }
  }
  if (!access_code) return NextResponse.json({ error: 'No se pudo generar código único' }, { status: 500 })

  const projectName = `${lead.nombre} — ${lead.servicio ?? 'Proyecto'}`.slice(0, 100)
  const { data: project, error: projError } = await supabase
    .from('projects')
    .insert([{ lead_id: leadId, name: projectName, access_code }])
    .select().single()

  if (projError || !project) return NextResponse.json({ error: 'Error creando proyecto' }, { status: 500 })

  // Enviar email con acceso solo si tiene email
  if (lead.email) {
    try {
      const nodemailer = (await import('nodemailer')).default
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      })
      const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artiaagency.vercel.app'}/client/${access_code}`
      await transporter.sendMail({
        from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
        to: lead.email,
        subject: `Tu portal de proyecto está listo — ${lead.folio ?? projectName}`,
        html: `
<div style="max-width:520px;margin:0 auto;font-family:Arial,sans-serif;padding:32px 16px;">
  <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" width="120" style="background:#00113a;padding:12px;border-radius:8px;display:block;margin-bottom:24px;"/>
  <h2 style="color:#00113a;margin:0 0 12px;">Hola ${lead.nombre}, tu portal está listo</h2>
  <p style="color:#475569;font-size:14px;line-height:1.6;">Puedes acceder a tu proyecto, descargar archivos y ver el avance usando tu código de acceso:</p>
  <div style="background:#f1f5f9;border:2px dashed #2552ca;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
    <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:1px;margin-bottom:8px;">CÓDIGO DE ACCESO</div>
    <div style="font-size:28px;font-weight:900;color:#00113a;letter-spacing:4px;font-family:monospace;">${access_code}</div>
  </div>
  <a href="${portalUrl}" style="display:block;text-align:center;background:#2552ca;color:#fff;padding:14px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;">Acceder a mi portal →</a>
  <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:20px;">Artia Studio · artia.estudioin@gmail.com</p>
</div>`,
      })
    } catch (e) { console.error('Error enviando email access_code:', e) }
  }

  return NextResponse.json({ ok: true, project, created: true })
}