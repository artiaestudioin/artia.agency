// ============================================
// types/ar.ts
// Tipos para la plataforma WebAR de Artia
// ============================================

export type ARExperienceStatus = 'draft' | 'active' | 'paused' | 'archived'
export type OccasionType =
  | 'fathers_day'
  | 'mothers_day'
  | 'birthday'
  | 'anniversary'
  | 'valentines'
  | 'christmas'
  | 'graduation'
  | 'custom'

export type ARModelType = '3d_glb' | '2d_image' | 'video'

export interface ARExperience {
  id: string
  slug: string                       // ID único para URL pública y QR
  title: string
  message: string                    // Mensaje personalizado al destinatario
  recipient_name: string
  occasion: OccasionType
  status: ARExperienceStatus

  // Branding visual
  bg_image: string | null
  bg_color: string
  primary_color: string
  secondary_color: string
  font_family: string

  // Contenido 3D / 2D
  model_url: string | null           // .glb
  model_ios_url: string | null       // .usdz para iOS AR Quick Look
  model_type: ARModelType
  model_alt: string

  // Botón AR
  cta_text: string
  cta_color: string
  cta_text_color: string
  cta_border_radius: number
  cta_icon: string

  // Audio
  audio_url: string | null
  audio_autoplay: boolean

  // Frame decorativo
  frame_style: 'none' | 'elegant' | 'floral' | 'minimal' | 'luxury'

  // Metadatos
  campaign_id: string | null
  qr_code_url: string | null
  public_url: string | null

  // Stats
  scan_count: number
  ar_launch_count: number

  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ARAsset {
  id: string
  experience_id: string
  file_name: string
  file_url: string
  file_type: 'glb' | 'usdz' | 'image' | 'audio' | 'video'
  file_size: number
  mime_type: string
  created_at: string
}

export interface ARCampaign {
  id: string
  name: string
  description: string | null
  occasion: OccasionType
  active: boolean
  experience_count: number
  created_at: string
}

// ---- Inputs ----

export interface CreateARExperienceInput {
  title: string
  message: string
  recipient_name: string
  occasion: OccasionType
  bg_color?: string
  primary_color?: string
  secondary_color?: string
  model_url?: string
  model_ios_url?: string
  model_type?: ARModelType
  model_alt?: string
  cta_text?: string
  campaign_id?: string
}

export interface UpdateARExperienceInput {
  title?: string
  message?: string
  recipient_name?: string
  occasion?: OccasionType
  status?: ARExperienceStatus
  bg_image?: string | null
  bg_color?: string
  primary_color?: string
  secondary_color?: string
  font_family?: string
  model_url?: string | null
  model_ios_url?: string | null
  model_type?: ARModelType
  model_alt?: string
  cta_text?: string
  cta_color?: string
  cta_text_color?: string
  cta_border_radius?: number
  cta_icon?: string
  audio_url?: string | null
  audio_autoplay?: boolean
  frame_style?: ARExperience['frame_style']
  campaign_id?: string | null
}

// ---- Defaults ----

export const OCCASION_LABELS: Record<OccasionType, string> = {
  fathers_day:  'Día del Padre',
  mothers_day:  'Día de la Madre',
  birthday:     'Cumpleaños',
  anniversary:  'Aniversario',
  valentines:   'San Valentín',
  christmas:    'Navidad',
  graduation:   'Graduación',
  custom:       'Personalizado',
}

export const OCCASION_EMOJIS: Record<OccasionType, string> = {
  fathers_day:  '👔',
  mothers_day:  '🌸',
  birthday:     '🎂',
  anniversary:  '💍',
  valentines:   '❤️',
  christmas:    '🎄',
  graduation:   '🎓',
  custom:       '✨',
}

export const DEFAULT_AR_EXPERIENCE: Omit<ARExperience,
  'id' | 'slug' | 'qr_code_url' | 'public_url' | 'scan_count' | 'ar_launch_count' | 'created_at' | 'updated_at' | 'created_by'
> = {
  title:             'Mi Regalo Especial',
  message:           'Tienes un regalo esperándote. Toca el botón para descubrirlo.',
  recipient_name:    '',
  occasion:          'birthday',
  status:            'draft',
  bg_image:          null,
  bg_color:          '#0a0a0f',
  primary_color:     '#c084fc',
  secondary_color:   '#818cf8',
  font_family:       'Playfair Display',
  model_url:         'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  model_ios_url:     'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
  model_type:        '3d_glb',
  model_alt:         'Tu regalo en realidad aumentada',
  cta_text:          'Abrir Cámara',
  cta_color:         '#c084fc',
  cta_text_color:    '#ffffff',
  cta_border_radius: 999,
  cta_icon:          'camera',
  audio_url:         null,
  audio_autoplay:    false,
  frame_style:       'elegant',
  campaign_id:       null,
}
