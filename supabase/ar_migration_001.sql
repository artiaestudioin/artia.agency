-- ============================================================
-- Migration: ar_migration_001.sql
-- Añade columnas nuevas a ar_experiences
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE ar_experiences
  ADD COLUMN IF NOT EXISTS subtitle          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bg_overlay_opacity NUMERIC(4,2) NOT NULL DEFAULT 0.55,
  ADD COLUMN IF NOT EXISTS font_size_title   INTEGER NOT NULL DEFAULT 34,
  ADD COLUMN IF NOT EXISTS text_color        VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS card_bg_color     VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS card_opacity      NUMERIC(4,2) NOT NULL DEFAULT 0.12,
  ADD COLUMN IF NOT EXISTS card_border_radius INTEGER NOT NULL DEFAULT 28,
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS animation_name    TEXT,
  ADD COLUMN IF NOT EXISTS animation_autoplay BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS animation_loop    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS animation_speed   NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS cta_animation     VARCHAR(20) NOT NULL DEFAULT 'pulse';

-- Verificar columnas añadidas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ar_experiences'
  AND column_name IN (
    'subtitle', 'bg_overlay_opacity', 'font_size_title', 'text_color',
    'card_bg_color', 'card_opacity', 'card_border_radius', 'logo_url',
    'animation_name', 'animation_autoplay', 'animation_loop',
    'animation_speed', 'cta_animation'
  )
ORDER BY column_name;
