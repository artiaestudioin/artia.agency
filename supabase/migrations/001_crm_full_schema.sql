-- ═══════════════════════════════════════════════════════════════
-- ARTIA CRM — Full Schema Migration
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. LEADS — tabla principal con campos CRM completos
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'nuevo'
    CHECK (estado IN ('nuevo','contactado','en_proceso','cerrado','perdido')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS final_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendiente'
    CHECK (payment_status IN ('pendiente','parcial','pagado')),
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS folio TEXT,
  ADD COLUMN IF NOT EXISTS folio_num SERIAL;

-- 2. PAYMENTS — control financiero por lead
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pagado'
    CHECK (status IN ('pagado','pendiente','cancelado')),
  method      TEXT DEFAULT 'transferencia'
    CHECK (method IN ('transferencia','efectivo','tarjeta','cheque','otro')),
  description TEXT,
  fecha       TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROJECTS — proyecto vinculado a lead
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  access_code TEXT UNIQUE NOT NULL,
  status      TEXT DEFAULT 'activo'
    CHECK (status IN ('activo','entregado','archivado')),
  event_date  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROJECT_FILES — archivos por proyecto
CREATE TABLE IF NOT EXISTS project_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  file_type   TEXT,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMAIL_TEMPLATES — ya existe, agregar campo pdf_attachments
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS pdf_attachments JSONB DEFAULT '[]'::jsonb;

-- 6. EMAIL_SENDS — log de envíos con PDF
ALTER TABLE email_sends
  ADD COLUMN IF NOT EXISTS has_attachment BOOLEAN DEFAULT false;

-- ── Índices para performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_fecha ON payments(fecha);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_access_code ON projects(access_code);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- ── RLS policies ─────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Payments: solo auth
CREATE POLICY "payments_auth" ON payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projects: auth full + anon solo por access_code (portal cliente)
CREATE POLICY "projects_auth" ON projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "projects_client_read" ON projects
  FOR SELECT TO anon
  USING (true); -- filtrado por access_code en la app

-- Project files: auth full + anon read para portal cliente
CREATE POLICY "files_auth" ON project_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "files_client_read" ON project_files
  FOR SELECT TO anon USING (true);

-- ── Función para generar access_code único ───────────────────
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  result := 'ASMK-' || result || '-' ||
    to_char(floor(random() * 9000 + 1000)::int, 'FM9999');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ── Vista consolidada para dashboard ────────────────────────
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE estado != 'perdido' AND estado != 'cerrado') AS leads_activos,
  (SELECT COUNT(*) FROM leads WHERE estado = 'cerrado') AS leads_cerrados,
  (SELECT COUNT(*) FROM leads) AS leads_total,
  (SELECT COALESCE(SUM(amount), 0) FROM payments
   WHERE status = 'pagado'
   AND fecha >= date_trunc('month', NOW())) AS ingresos_mes,
  (SELECT COALESCE(SUM(amount), 0) FROM payments
   WHERE status = 'pendiente') AS pendientes_cobro,
  (SELECT COALESCE(SUM(amount), 0) FROM payments
   WHERE status = 'pagado') AS ingresos_total;
