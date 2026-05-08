import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/admin/landings — list landing pages from 'landings' table */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('landings')
    .select('id, name, slug, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ landings: data })
}

/** POST /api/admin/landings — create new landing page */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name,
      slug,
      description,
      config,
      status = 'draft',
      html_content,
      conversion_goal,
    } = body

    // ── Validación ──────────────────────────────────────────────
    const fieldErrors: Record<string, string> = {}

    if (!name?.trim()) fieldErrors.name = 'El nombre es obligatorio'
    if (!slug?.trim()) fieldErrors.slug = 'El slug es obligatorio'
    if (slug?.trim().length < 2) fieldErrors.slug = 'El slug debe tener al menos 2 caracteres'
    if (slug?.trim() && !/^[a-z0-9-]+$/.test(slug.trim())) {
      fieldErrors.slug = 'Solo letras minúsculas, números y guiones'
    }
    if (config?.price != null && config.price <= 0) fieldErrors.price = 'El precio debe ser mayor a 0'
    if (!config?.headline?.trim()) fieldErrors.headline = 'El headline es obligatorio'
    if (!config?.image?.trim()) fieldErrors.image = 'La imagen principal es obligatoria'
    if (config?.whatsapp && !/^\d{10,15}$/.test(config.whatsapp.replace(/\D/g, ''))) {
      fieldErrors.whatsapp = 'Número de WhatsApp inválido (10-15 dígitos)'
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: 'Corrige los errores marcados', fieldErrors },
        { status: 422 }
      )
    }

    const supabase = await createClient()

    // Auto-generar slug si no viene
    const finalSlug = slug?.trim() || name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)

    // Verificar slug único
    const { data: existing } = await supabase
      .from('landings')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Este slug ya está en uso', fieldErrors: { slug: 'Este slug ya está en uso' } },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('landings')
      .insert({
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        config: config || {},
        status,
        html_content: html_content?.trim() || null,
        conversion_goal: conversion_goal || 'purchase',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ landing: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}