-- ═══════════════════════════════════════════════════════════════
-- ARTIA STUDIO — Migración v5
-- Ejecutar en: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Agregar columnas faltantes en leads ────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telefono        text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estado          text DEFAULT 'nuevo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notas_internas  text;

-- ── 2. Políticas RLS para leads (crear solo si no existen) ────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='Admin lee leads') THEN
    CREATE POLICY "Admin lee leads"
      ON leads FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='Sitio inserta leads') THEN
    CREATE POLICY "Sitio inserta leads"
      ON leads FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='Admin actualiza leads') THEN
    CREATE POLICY "Admin actualiza leads"
      ON leads FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- ── 3. Tabla proyectos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proyectos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  cliente     text,
  categoria   text,   -- branding | fotografia | impresion | marketing | web
  descripcion text,
  imagen_url  text,
  tags        text[],
  destacado   boolean DEFAULT false,
  visible     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proyectos' AND policyname='Admin gestiona proyectos') THEN
    CREATE POLICY "Admin gestiona proyectos"
      ON public.proyectos FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proyectos' AND policyname='Público lee proyectos') THEN
    CREATE POLICY "Público lee proyectos"
      ON public.proyectos FOR SELECT TO anon
      USING (visible = true);
  END IF;
END $$;

-- ── 4. Proyecto de ejemplo: Branding ─────────────────────────
INSERT INTO public.proyectos (titulo, cliente, categoria, descripcion, imagen_url, destacado, visible)
SELECT
  'Identidad Corporativa — Branding Completo',
  'Cliente Ejemplo S.A.',
  'branding',
  'Desarrollo de identidad visual completa: logotipo, paleta de colores, tipografía corporativa, tarjetas de presentación y manual de marca. Resultado: +40% en reconocimiento de marca.',
  'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.proyectos WHERE categoria = 'branding');

-- ── 5. RLS email_sends para admin ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_sends' AND policyname='Admin lee email_sends') THEN
    CREATE POLICY "Admin lee email_sends"
      ON email_sends FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
