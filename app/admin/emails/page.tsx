import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function EmailsPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, name, description, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '0 0 6px' }}>
            Plantillas de email
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            Crea y edita plantillas con el editor visual. Se guardan en Supabase.
          </p>
        </div>
        <Link
          href="/admin/emails/nueva"
          style={{
            background: '#00113a',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.5px',
          }}
        >
          + Nueva plantilla
        </Link>
      </div>

      {/* Grid de plantillas */}
      {templates && templates.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {templates.map(t => (
            <div key={t.id} style={{
              background: '#fff',
              border: '0.5px solid #e2e8f0',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                  {t.name}
                </p>
                {t.description && (
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                    {t.description}
                  </p>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1' }}>
                Actualizado: {new Date(t.updated_at).toLocaleDateString('es-EC', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Link
                  href={`/admin/emails/${t.id}`}
                  style={{
                    flex: 1,
                    background: '#00113a',
                    color: '#fff',
                    padding: '8px 0',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  Editar
                </Link>
                <SendButton templateId={t.id} templateName={t.name} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          background: '#fff',
          border: '0.5px solid #e2e8f0',
          borderRadius: 12,
          padding: '64px 32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 32, margin: '0 0 12px' }}>✉️</p>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            Aún no tienes plantillas
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#94a3b8' }}>
            Crea tu primera plantilla con el editor visual GrapesJS.
          </p>
          <Link
            href="/admin/emails/nueva"
            style={{
              background: '#2552ca',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Crear primera plantilla
          </Link>
        </div>
      )}
    </div>
  )
}

// Botón de envío de prueba (client component inline)
function SendButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  return (
    <Link
      href={`/admin/emails/${templateId}/enviar`}
      style={{
        flex: 1,
        background: '#f1f5f9',
        color: '#475569',
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        textAlign: 'center',
        border: '0.5px solid #e2e8f0',
      }}
    >
      Enviar
    </Link>
  )
}
