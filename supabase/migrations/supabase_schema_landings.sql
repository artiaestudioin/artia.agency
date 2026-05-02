
-- ============================================
-- LANDING PAGE BUILDER + CRM SYSTEM
-- Supabase Schema for Artia CRM
-- ============================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS landings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS utm_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. LANDINGS (Páginas de destino)
-- ============================================
CREATE TABLE IF NOT EXISTS landings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Config JSONB (estructura completa de la landing)
  config JSONB NOT NULL DEFAULT '{
    "headline": "",
    "subheadline": "",
    "cta_text": "¡Comprar Ahora!",
    "cta_subtext": "Envío gratis",
    "product_name": "",
    "product_subtitle": "",
    "price": 0,
    "old_price": 0,
    "discount": "",
    "currency": "$",
    "image": "",
    "gallery": [],
    "features": [],
    "testimonials": [],
    "whatsapp": "",
    "pixel_id": "",
    "capi_token": "",
    "posthog_key": "",
    "stock_total": 50,
    "stock_current": 12,
    "viewers_min": 8,
    "viewers_max": 34,
    "countdown_hours": 24,
    "color_primary": "#667eea",
    "color_secondary": "#764ba2",
    "gradient_hero": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "gradient_cta": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "meta_title": "",
    "meta_description": "",
    "meta_image": "",
    "form_fields": ["name", "phone", "address", "design"],
    "show_stock_bar": true,
    "show_countdown": true,
    "show_testimonials": true,
    "show_features": true,
    "show_gallery": true,
    "sticky_cta": true,
    "payment_method": "whatsapp",
    "redirect_url": null,
    "custom_css": "",
    "custom_js": ""
  }'::jsonb,

  -- HTML override (opcional, para custom landings)
  html_content TEXT,

  -- Status & Scheduling
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- UTM & Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  conversion_goal TEXT DEFAULT 'purchase' CHECK (conversion_goal IN ('purchase', 'lead', 'signup', 'call', 'custom')),

  -- Analytics
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  revenue_total DECIMAL(12,2) DEFAULT 0,

  -- A/B Testing
  is_variant BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES landings(id) ON DELETE SET NULL,
  variant_name TEXT,
  traffic_split INTEGER DEFAULT 50, -- % de tráfico para esta variante

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_landings_slug ON landings(slug);
CREATE INDEX IF NOT EXISTS idx_landings_status ON landings(status);
CREATE INDEX IF NOT EXISTS idx_landings_parent ON landings(parent_id);
CREATE INDEX IF NOT EXISTS idx_landings_config ON landings USING GIN(config);

-- ============================================
-- 2. LANDING VARIANTS (A/B Testing detalle)
-- ============================================
CREATE TABLE IF NOT EXISTS landing_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id UUID NOT NULL REFERENCES landings(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES landings(id) ON DELETE CASCADE,
  traffic_split INTEGER NOT NULL DEFAULT 50,
  winner_criteria TEXT DEFAULT 'conversions' CHECK (winner_criteria IN ('conversions', 'revenue', 'ctr')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. LANDING EVENTS (Tracking granular)
-- ============================================
CREATE TABLE IF NOT EXISTS landing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id UUID NOT NULL REFERENCES landings(id) ON DELETE CASCADE,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'scroll_25', 'scroll_50', 'scroll_75', 'scroll_90',
    'click_cta', 'click_whatsapp', 'initiate_checkout', 'purchase',
    'form_start', 'form_submit', 'file_upload', 'time_on_page',
    'exit_intent', 'variant_view'
  )),
  event_data JSONB DEFAULT '{}',

  -- UTM params captured
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- User data (hashed for privacy)
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Meta Pixel data
  fbp TEXT,
  fbc TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_landing ON landing_events(landing_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON landing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_session ON landing_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON landing_events(created_at);

-- ============================================
-- 4. LANDING ORDERS (Leads desde landings)
-- ============================================
CREATE TABLE IF NOT EXISTS landing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id UUID NOT NULL REFERENCES landings(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES landings(id),

  -- Folio único de tracking
  folio TEXT UNIQUE NOT NULL,

  -- Cliente
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'EC',

  -- Producto
  product_name TEXT,
  product_id UUID,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2),
  total DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',

  -- Diseño / Custom
  design_description TEXT,
  design_files JSONB DEFAULT '[]',

  -- Status pipeline
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'in_production', 'shipped', 
    'delivered', 'cancelled', 'refunded'
  )),

  -- Timeline
  timeline JSONB DEFAULT '[]',

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  payment_method TEXT,

  -- Tracking
  tracking_number TEXT,
  tracking_url TEXT,

  -- UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Meta
  meta_event_id TEXT,

  -- Notifications
  email_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_folio ON landing_orders(folio);
CREATE INDEX IF NOT EXISTS idx_orders_landing ON landing_orders(landing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON landing_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON landing_orders(phone);

-- ============================================
-- 5. UTM LINKS (Generador de URLs)
-- ============================================
CREATE TABLE IF NOT EXISTS utm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id UUID NOT NULL REFERENCES landings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- UTM Params
  utm_source TEXT NOT NULL,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Generated URL
  full_url TEXT NOT NULL,

  -- Stats
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS landings_updated_at ON landings;
CREATE TRIGGER landings_updated_at
  BEFORE UPDATE ON landings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON landing_orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON landing_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate folio function
CREATE OR REPLACE FUNCTION generate_folio()
RETURNS TEXT AS $$
DECLARE
  new_folio TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_folio := 'ART-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM landing_orders WHERE folio = new_folio) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_folio;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate folio on insert
CREATE OR REPLACE FUNCTION set_folio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL THEN
    NEW.folio := generate_folio();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_folio ON landing_orders;
CREATE TRIGGER orders_set_folio
  BEFORE INSERT ON landing_orders
  FOR EACH ROW EXECUTE FUNCTION set_folio();

-- Increment views function
CREATE OR REPLACE FUNCTION increment_landing_views(landing_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE landings 
  SET views_count = views_count + 1 
  WHERE id = landing_uuid;
END;
$$ LANGUAGE plpgsql;

-- Increment conversions function
CREATE OR REPLACE FUNCTION increment_landing_conversion(landing_uuid UUID, revenue_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE landings 
  SET 
    conversions_count = conversions_count + 1,
    revenue_total = revenue_total + revenue_amount
  WHERE id = landing_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Landings: Admin full access, public read active only
CREATE POLICY "landings_admin_all" ON landings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "landings_public_read" ON landings
  FOR SELECT TO anon USING (status = 'active');

-- Landing Events: Insert anon, read admin
CREATE POLICY "events_admin_read" ON landing_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "events_anon_insert" ON landing_events
  FOR INSERT TO anon WITH CHECK (true);

-- Orders: Admin all, client read own by folio
CREATE POLICY "orders_admin_all" ON landing_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "orders_client_read" ON landing_orders
  FOR SELECT TO anon USING (true); -- Filter by folio in query

-- UTM Links: Admin all
CREATE POLICY "utm_admin_all" ON utm_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 8. VIEWS (Para dashboards)
-- ============================================

CREATE OR REPLACE VIEW landing_stats AS
SELECT 
  l.id,
  l.slug,
  l.name,
  l.status,
  l.views_count,
  l.clicks_count,
  l.conversions_count,
  l.revenue_total,
  CASE WHEN l.views_count > 0 
    THEN ROUND((l.conversions_count::DECIMAL / l.views_count) * 100, 2) 
    ELSE 0 
  END as conversion_rate,
  CASE WHEN l.views_count > 0 
    THEN ROUND((l.clicks_count::DECIMAL / l.views_count) * 100, 2) 
    ELSE 0 
  END as ctr,
  COUNT(o.id) as total_orders,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN o.payment_status = 'paid' THEN 1 END) as paid_orders,
  l.created_at
FROM landings l
LEFT JOIN landing_orders o ON o.landing_id = l.id
GROUP BY l.id;

CREATE OR REPLACE VIEW daily_events AS
SELECT 
  landing_id,
  DATE(created_at) as date,
  event_type,
  COUNT(*) as count
FROM landing_events
GROUP BY landing_id, DATE(created_at), event_type;

