import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { to, asunto, cuerpo, nombre, folio, estado, trackingUrl } = await req.json()

  if (!to || !asunto || !cuerpo) {
    return NextResponse.json({ error: 'to, asunto y cuerpo son requeridos' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to,
      subject: asunto,
      html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:#00113a;padding:24px 32px;text-align:center;">
              <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="Artia" width="120" style="height:auto;display:block;margin:0 auto;" />
            </td>
          </tr>
          
          <!-- Barra de estado -->
          <tr>
            <td style="background:#2552ca;padding:14px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#fff;letter-spacing:1px;text-transform:uppercase;">
                ACTUALIZACIÓN DE TU PEDIDO · ${folio || 'SIN FOLIO'}
              </p>
            </td>
          </tr>
          
          <!-- Cuerpo -->
          <tr>
            <td style="padding:32px;">
              
              <!-- Saludo -->
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">
                Hola, ${nombre || 'Cliente'} 👋
              </p>
              
              <!-- Mensaje -->
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                ${cuerpo}
              </p>
              
              <!-- Tarjeta de estado -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">
                      ESTADO ACTUAL
                    </p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">
                      🔍 ${estado || 'En revisión'}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Texto adicional -->
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                Puedes ver el estado completo de tu pedido haciendo clic en el botón. No necesitas contraseña.
              </p>
              
              <!-- Botón CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="border-radius:8px;background:#00113a;text-align:center;">
                    <a href="${trackingUrl || '#'}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:8px;">
                      Ver seguimiento de mi pedido →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Link alternativo -->
              <p style="margin:0;text-align:center;font-size:13px;color:#64748b;">
                O copia este enlace: 
                <a href="${trackingUrl || '#'}" style="color:#2552ca;text-decoration:underline;">
                  ${trackingUrl || `https://artiaagency.vercel.app/seguimiento/${folio || ''}`}
                </a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#00113a;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);">
                ©2026 Artia Studio · Ecuador
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('send-quick-email error:', err)
    return NextResponse.json({ error: err.message ?? 'Error al enviar email' }, { status: 500 })
  }
}