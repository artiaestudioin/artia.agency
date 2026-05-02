// lib/landing-validator.ts
import { LandingConfig } from '@/types/landing'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export function validateLandingConfig(config: LandingConfig): ValidationError[] {
  const errors: ValidationError[] = []

  // Critical errors
  if (!config.headline || config.headline.length < 10) {
    errors.push({
      field: 'headline',
      message: 'El headline debe tener al menos 10 caracteres para ser efectivo',
      severity: 'error',
    })
  }

  if (!config.image) {
    errors.push({
      field: 'image',
      message: 'La imagen principal es obligatoria',
      severity: 'error',
    })
  }

  if (config.price <= 0) {
    errors.push({
      field: 'price',
      message: 'El precio debe ser mayor a 0',
      severity: 'error',
    })
  }

  if (!config.whatsapp || config.whatsapp.length < 10) {
    errors.push({
      field: 'whatsapp',
      message: 'Número de WhatsApp inválido o faltante',
      severity: 'error',
    })
  }

  // Warnings (conversion optimization)
  if (config.headline && !config.headline.includes('?') && !config.headline.includes('!')) {
    errors.push({
      field: 'headline',
      message: 'Considera usar signos de interrogación o exclamación para aumentar el engagement',
      severity: 'warning',
    })
  }

  if (config.testimonials.length < 2) {
    errors.push({
      field: 'testimonials',
      message: 'Añade al menos 2 testimonios para aumentar la confianza social',
      severity: 'warning',
    })
  }

  if (!config.discount && config.old_price <= config.price) {
    errors.push({
      field: 'discount',
      message: 'No hay descuento visible. Considera mostrar un precio anterior más alto',
      severity: 'warning',
    })
  }

  if (!config.pixel_id) {
    errors.push({
      field: 'pixel_id',
      message: 'Sin Meta Pixel configurado. No podrás trackear conversiones en Meta Ads',
      severity: 'warning',
    })
  }

  if (config.countdown_hours < 1 || config.countdown_hours > 72) {
    errors.push({
      field: 'countdown_hours',
      message: 'El countdown óptimo está entre 1-72 horas para crear urgencia real',
      severity: 'info',
    })
  }

  if (config.stock_current > config.stock_total * 0.5) {
    errors.push({
      field: 'stock_current',
      message: 'Considera reducir el stock mostrado para aumentar la escasez percibida',
      severity: 'info',
    })
  }

  return errors
}

export function getLandingScore(config: LandingConfig): { score: number; max: number; grade: string } {
  const max = 100
  let score = 0

  // Content (30 pts)
  if (config.headline.length > 20) score += 10
  if (config.subheadline.length > 30) score += 5
  if (config.cta_text.length > 5) score += 5
  if (config.product_name) score += 5
  if (config.image) score += 5

  // Social Proof (20 pts)
  score += Math.min(config.testimonials.length * 5, 15)
  if (config.testimonials.some(t => t.image)) score += 5

  // Urgency (20 pts)
  if (config.show_countdown) score += 5
  if (config.show_stock_bar) score += 5
  if (config.discount) score += 5
  if (config.old_price > config.price) score += 5

  // Trust (15 pts)
  if (config.features.length >= 3) score += 5
  if (config.show_testimonials) score += 5
  if (config.sticky_cta) score += 5

  // Tracking (15 pts)
  if (config.pixel_id) score += 5
  if (config.capi_token) score += 5
  if (config.posthog_key) score += 5

  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'

  return { score, max, grade }
}
