// app/api/catalog/products/route.ts
// ─── Public & Admin products API ─────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ─── GET: Public product listing for website catalog ──────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const categorySlug = url.searchParams.get('category')
  const search       = url.searchParams.get('q')
  const featured     = url.searchParams.get('featured')
  const limit        = parseInt(url.searchParams.get('limit') || '50')
  const page         = parseInt(url.searchParams.get('page') || '1')
  const offset       = (page - 1) * limit

  // Use service role for public reads (bypasses RLS policies for anon)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let query = supabase
      .from('catalog_products_view')
      .select('id,name,slug,category_name,category_slug,category_icon,subcategory,short_description,price,discount_price,discount_pct,stock_status,cover_image,images,tags,custom_label,label_color,featured,whatsapp_message', { count: 'exact' })
      .eq('active', true)
      .eq('visible_on_website', true)
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (categorySlug) {
      query = query.eq('category_slug', categorySlug)
    }

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      ok: true,
      products: data || [],
      total: count || 0,
      page,
      pages: Math.ceil((count || 0) / limit),
    }, { headers: CORS })

  } catch (e: any) {
    console.error('[Products API] GET error:', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500, headers: CORS })
  }
}

// ─── GET single by slug: /api/catalog/products?slug=xyz ──────────
// Already handled by query param above — extend GET to support slug
