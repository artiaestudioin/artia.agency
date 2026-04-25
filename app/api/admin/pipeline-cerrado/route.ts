import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

function generateAccessCode(): string {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const num    = Math.floor(Math.random() * 9000 + 1000)
  return `ASMK-${suffix}-${num}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Solo admin autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { leadId } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })

  // Verificar si ya tiene proyecto
  const { data: existing } = await supabase
    .from('projects')
    .select('id, access_code')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, project: existing, created: false })
  }

  // Obtener datos del lead
  const { data: lead } = await supabase
    .from('leads')
    .select('nombre, email, servicio, folio')
    .eq('id', leadId)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

  // Generar access_code único
  let access_code = generateAccessCode()
  let attempts    = 0

  while (attempts < 10) {
    const { data: conflict } = await supabase
      .from('projects')
      .select('id')
      .eq('access_code', access_code)
      .maybeSingle()
    if (!conflict) break
    access_code = generateAccessCode()
    attempts++
  }

  // Crear proyecto
  const projectName = `${lead.nombre} — ${lead.servicio ?? 'Proyecto'}`.slice(0, 100)

  const { data: project, error: projError } = await supabase
    .from('projects')
    .insert([{ lead_id: leadId, name: projectName, access_code }])
    .select()
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Error creando proyecto' }, { status: 500 })
  }

  // Enviar correo al cliente con el access_code (si tiene email)
  if (lead.email) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      })

      const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artiaagency.vercel.app'}/client/${access_code}`

      await transporter.sendMail({
        from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
        to:   lead.email,
        subject: `Tu proyecto con Artia está listo — ${lead.folio ?? projectName}`,
        html: `
<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"/><style>
  body { margin: 0; padding: 32px 16px; background: #eef0f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; }
  .header { background: #00113a; padding: 32px 40px; text-align: center; }
  .body { padding: 32px 40px; }
  .code { background: #f1f5f9; border: 1.5px dashed #2552ca; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
  .btn { display: inline-block; background: #2552ca; color: #fff; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="130" style="height:auto;"/>
  </div>
  <div class="body">
    <h2 style="color:#00113a;margin:0 0 8px;">¡Tu proyecto está listo, ${lead.nombre}!</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Hemos configurado tu portal exclusivo donde podrás ver el avance de tu proyecto,
      descargar archivos y hacer seguimiento de todo.
    </p>
    <div class="code">
      <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Tu código de acceso</div>
      <div style="font-size:28px;font-weight:900;color:#00113a;letter-spacing:4px;font-family:monospace;">${access_code}</div>
    </div>
    <p style="text-align:center;">
      <a href="${portalUrl}" class="btn">Acceder a mi portal →</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:20px;">
      También puedes visitar <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/client" style="color:#2552ca;">artiaagency.vercel.app/client</a><br/>
      e ingresar tu código manualmente.
    </p>
  </div>
  <div style="background:#00113a;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);">Artia Studio · artia.estudioin@gmail.com · +593 969 937 265</p>
  </div>
</div>
</body></html>`,
      })
    } catch (mailErr) {
      console.error('Error enviando correo access_code:', mailErr)
      // No retornamos error — el proyecto fue creado correctamente
    }
  }

  return NextResponse.json({ ok: true, project, created: true })
}
