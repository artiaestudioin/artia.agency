-- ============================================================
-- Migration: ar_migration_002.sql
-- Experiencia AR híbrida: motor (immersive/native/hybrid),
-- confeti, mensaje de voz y audio sincronizado con el lanzamiento.
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE ar_experiences
  -- Motor de la experiencia:
  --   immersive = cámara dentro del navegador + modelo 3D + confeti/audio/voz (control total)
  --   native    = entrega a la AR del sistema (Scene Viewer / Quick Look)
  --   hybrid    = inmersiva por defecto + botón opcional "verlo sobre mi mesa" (nativa)
  ADD COLUMN IF NOT EXISTS ar_mode               TEXT    NOT NULL DEFAULT 'hybrid',

  -- Confeti (overlay con control total, solo en modo immersive/hybrid)
  ADD COLUMN IF NOT EXISTS confetti_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS confetti_style        TEXT    NOT NULL DEFAULT 'hearts',
  ADD COLUMN IF NOT EXISTS confetti_colors       TEXT    NOT NULL DEFAULT '',

  -- Mensaje de voz personalizado (se reproduce 1 vez al abrir la sorpresa).
  -- Distinto de audio_url, que es la música de fondo en loop.
  ADD COLUMN IF NOT EXISTS voice_message_url     TEXT,

  -- Sincroniza la música con el gesto del usuario (evita bloqueo de autoplay móvil).
  ADD COLUMN IF NOT EXISTS audio_start_on_launch BOOLEAN NOT NULL DEFAULT TRUE,

  -- Escala del modelo dentro de la escena inmersiva (encuadre).
  ADD COLUMN IF NOT EXISTS model_scale           NUMERIC(4,2) NOT NULL DEFAULT 1.0;

-- Restricciones de valores válidos (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ar_experiences_ar_mode_chk') THEN
    ALTER TABLE ar_experiences
      ADD CONSTRAINT ar_experiences_ar_mode_chk
      CHECK (ar_mode IN ('immersive', 'native', 'hybrid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ar_experiences_confetti_style_chk') THEN
    ALTER TABLE ar_experiences
      ADD CONSTRAINT ar_experiences_confetti_style_chk
      CHECK (confetti_style IN ('classic', 'hearts', 'stars', 'petals'));
  END IF;
END $$;

-- Verificar columnas añadidas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ar_experiences'
  AND column_name IN (
    'ar_mode', 'confetti_enabled', 'confetti_style', 'confetti_colors',
    'voice_message_url', 'audio_start_on_launch', 'model_scale'
  )
ORDER BY column_name;
