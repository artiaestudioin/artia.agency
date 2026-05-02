// app/admin/landings/[id]/editar/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LandingForm from '../../LandingForm'

export const metadata = { title: 'Editar Landing — Artia Admin' }

export default async function EditarLandingPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: landing, error } = await supabase
    .from('landings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !landing) {
    notFound()
  }

  return (
    <LandingForm
      initialData={{
        id: landing.id,
        slug: landing.slug,
        name: landing.name,
        description: landing.description || '',
        config: landing.config,
        status: landing.status,
        html_content: landing.html_content || '',
      }}
    />
  )
}
