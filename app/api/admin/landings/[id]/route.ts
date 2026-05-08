import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** DELETE /api/admin/landings/[id] — delete landing page and its variants */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const supabase = await createClient()

  // Delete variants first (cascades from FK, but explicit for safety)
  await supabase.from('landing_variants').delete().eq('landing_id', id)

  const { error } = await supabase.from('landings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
//corregir nuevas
/** PATCH /api/admin/landings/[id] — update landing page */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = await createClient()

    // ── Validación ──────────────────────────────────────────────
    const fieldErrors: Record<string, string> = {}
    const {
      name,
      slug,
      description,
      config,
      status,
      html_content,
      conversion_goal,
    } = body

    if (name !== undefined && !name?.trim()) fieldErrors.name = 'El nombre es obligatorio'
    if (slug !== undefined) {
      if (!slug?.trim()) fieldErrors.slug = 'El slug es obligatorio'
      else if (slug.trim().length < 2) fieldErrors.slug = 'El slug debe tener al menos 2 caracteres'
      else if (!/^[a-z0-9-]+$/.test(slug.trim())) fieldErrors.slug = 'Solo letras minúsculas, números y guiones'
    }
    if (config?.price != null && config.price <= 0) fieldErrors.price = 'El precio debe ser mayor a 0'
    if (config?.headline !== undefined && !config?.headline?.trim()) {
      fieldErrors.headline = 'El headline es obligatorio'
    }
    if (config?.image !== undefined && !config?.image?.trim()) {
      fieldErrors.image = 'La imagen principal es obligatoria'
    }
    if (config?.whatsapp && !/^\d{10,15}$/.test(config.whatsapp.replace(/\D/g, ''))) {
      fieldErrors.whatsapp = 'Número de WhatsApp inválido (10-15 dígitos)'
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: 'Corrige los errores marcados', fieldErrors },
        { status: 422 }
      )
    }

    // Verificar slug único (solo si cambió)
    if (slug?.trim()) {
      const { data: existing } = await supabase
        .from('landings')
        .select('id')
        .eq('slug', slug.trim())
        .neq('id', id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'Este slug ya está en uso', fieldErrors: { slug: 'Este slug ya está en uso' } },
          { status: 409 }
        )
      }
    }

    // Construir objeto de actualización (solo campos que vienen)
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (slug !== undefined) updateData.slug = slug.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (config !== undefined) updateData.config = config
    if (status !== undefined) updateData.status = status
    if (html_content !== undefined) updateData.html_content = html_content?.trim() || null
    if (conversion_goal !== undefined) updateData.conversion_goal = conversion_goal

    const { data, error } = await supabase
      .from('landings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ landing: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}