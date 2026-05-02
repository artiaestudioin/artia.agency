// app/api/admin/landings/[id]/duplicate/route.ts
// FIX: params debe ser Promise<{ id: string }> en Next.js 15
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { variant_name, traffic_split = 50 } = await request.json()

  const { data: original, error: fetchError } = await supabase
    .from('landings')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Landing not found' }, { status: 404 })
  }

  const { data: variant, error: createError } = await supabase
    .from('landings')
    .insert({
      slug: `${original.slug}-v${Date.now()}`,
      name: `${original.name} (Variante)`,
      description: original.description,
      config: original.config,
      html_content: original.html_content,
      status: 'draft',
      conversion_goal: original.conversion_goal,
      is_variant: true,
      parent_id: original.id,
      variant_name: variant_name || 'Variante A',
      traffic_split,
    })
    .select()
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  await supabase.from('landing_variants').insert({
    landing_id: original.id,
    variant_id: variant.id,
    traffic_split,
  })

  return NextResponse.json({ variant }, { status: 201 })
}
