import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ARCustomerExperience from './_components/ARCustomerExperience'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('ar_experiences')
    .select('title, message, recipient_name, bg_image')
    .eq('slug', id)
    .eq('status', 'active')
    .single()

  if (!data) return { title: 'Experiencia AR · Artia' }

  return {
    title: data.title,
    description: data.message,
    openGraph: {
      title: data.title,
      description: data.message,
      images: data.bg_image ? [data.bg_image] : [],
    },
  }
}

export default async function ARExperiencePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Intentar por slug primero, luego por id
  let query = supabase
    .from('ar_experiences')
    .select('*')
    .eq('status', 'active')

  // Si parece un UUID usamos id, si no usamos slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)
  query = isUUID ? query.eq('id', id) : query.eq('slug', id)

  const { data: experience, error } = await query.single()

  if (error || !experience) {
    return <NotFound />
  }

  return <ARCustomerExperience experience={experience} />
}

function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui',
      padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>🔮</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Experiencia no encontrada</h1>
      <p style={{ fontSize: 15, color: '#6b6894', margin: 0 }}>
        Este enlace expiró o no existe.<br />Verifica el QR e intenta de nuevo.
      </p>
    </div>
  )
}
