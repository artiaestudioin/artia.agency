// app/api/admin/landings/[id]/duplicate/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Generar slug único para la variante
    const timestamp = Date.now()
    const baseSlug = original.slug.replace(/-v\d+$/, '')
    const variantSlug = `${baseSlug}-v${timestamp}`

    const { data: variant, error: createError } = await supabase
      .from('landings')
      .insert({
        slug: variantSlug,
        name: `${original.name} (${variant_name || 'Variante'})`,
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

    const { error: variantLinkError } = await supabase.from('landing_variants').insert({
      landing_id: original.id,
      variant_id: variant.id,
      traffic_split,
    })

    if (variantLinkError) {
      console.error('Error linking variant:', variantLinkError.message)
    }

    return NextResponse.json({ variant }, { status: 201 })
  } catch (err: any) {
    console.error('Duplicate landing error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error interno al duplicar' },
      { status: 500 }
    )
  }
}