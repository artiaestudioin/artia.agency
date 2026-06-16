-- ============================================================
-- Migration: ar_migration_003.sql
-- AR anclada a marcador de imagen (MindAR).
-- Cada experiencia guarda la imagen objetivo (para imprimir en el regalo)
-- y el archivo .mind compilado que MindAR usa para rastrearla.
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE ar_experiences
  ADD COLUMN IF NOT EXISTS target_image_url TEXT,   -- imagen objetivo (se imprime junto al QR)
  ADD COLUMN IF NOT EXISTS target_mind_url  TEXT;   -- .mind compilado para el rastreo

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ar_experiences'
  AND column_name IN ('target_image_url', 'target_mind_url')
ORDER BY column_name;
