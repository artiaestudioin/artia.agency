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

// Motor de la experiencia AR
//   immersive = cámara dentro del navegador + modelo 3D + confeti/audio/voz (control total)
//   native    = entrega a la AR del sistema (Scene Viewer / Quick Look)
//   hybrid    = inmersiva por defecto + botón opcional "verlo sobre mi mesa"
export type ARMode = 'immersive' | 'native' | 'hybrid'

export type ConfettiStyle = 'classic' | 'hearts' | 'stars' | 'petals'

export interface ARExperience {
  id: string
  slug: string                       // ID único para URL pública y QR
  title: string
  subtitle: string                   // Subtítulo opcional
  message: string                    // Mensaje personalizado al destinatario
  recipient_name: string
  occasion: OccasionType
  status: ARExperienceStatus

  // Branding visual
  bg_image: string | null
  bg_color: string
  bg_overlay_opacity: number         // 0-1, opacidad del overlay sobre bg_image
  primary_color: string
  secondary_color: string
  font_family: string
  font_size_title: number            // px
  text_color: string                 // color del texto principal

  // Card de mensaje
  card_bg_color: string              // color de fondo de la card
  card_opacity: number               // 0-1
  card_border_radius: number

  // Logo
  logo_url: string | null

  // Contenido 3D / 2D
  model_url: string | null           // .glb
  model_ios_url: string | null       // .usdz para iOS AR Quick Look
  model_type: ARModelType
  model_alt: string

  // Animación
  animation_name: string | null      // nombre de la animación activa en el GLB
  animation_autoplay: boolean
  animation_loop: boolean
  animation_speed: number            // 1 = normal

  // Botón AR
  cta_text: string
  cta_color: string
  cta_text_color: string
  cta_border_radius: number
  cta_icon: string
  cta_animation: 'none' | 'pulse' | 'bounce' | 'glow'

  // Motor / escena AR
  ar_mode: ARMode
  model_scale: number                // escala del modelo en la escena inmersiva

  // Marcador de imagen (MindAR) — el modelo se ancla sobre esta imagen impresa
  target_image_url: string | null    // imagen objetivo (se imprime con el QR)
  target_mind_url: string | null     // .mind compilado para el rastreo

  // Confeti (overlay con control total — solo immersive/hybrid)
  confetti_enabled: boolean
  confetti_style: ConfettiStyle
  confetti_colors: string            // lista de hex separada por comas; vacío = usar primary/secondary

  // Audio
  audio_url: string | null           // música de fondo (loop)
  audio_autoplay: boolean
  audio_start_on_launch: boolean     // arranca la música al pulsar el botón (evita bloqueo móvil)
  voice_message_url: string | null   // mensaje de voz personalizado (1 reproducción al abrir)

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
  subtitle?: string
  message?: string
  recipient_name?: string
  occasion?: OccasionType
  status?: ARExperienceStatus

  bg_image?: string | null
  bg_color?: string
  bg_overlay_opacity?: number
  primary_color?: string
  secondary_color?: string
  font_family?: string
  font_size_title?: number
  text_color?: string

  card_bg_color?: string
  card_opacity?: number
  card_border_radius?: number

  logo_url?: string | null

  model_url?: string | null
  model_ios_url?: string | null
  model_type?: ARModelType
  model_alt?: string

  animation_name?: string | null
  animation_autoplay?: boolean
  animation_loop?: boolean
  animation_speed?: number

  cta_text?: string
  cta_color?: string
  cta_text_color?: string
  cta_border_radius?: number
  cta_icon?: string
  cta_animation?: ARExperience['cta_animation']

  audio_url?: string | null
  audio_autoplay?: boolean
  audio_start_on_launch?: boolean
  voice_message_url?: string | null

  ar_mode?: ARMode
  model_scale?: number
  target_image_url?: string | null
  target_mind_url?: string | null
  confetti_enabled?: boolean
  confetti_style?: ConfettiStyle
  confetti_colors?: string

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
  title:              'Mi Regalo Especial',
  subtitle:           '',
  message:            'Tienes un regalo esperándote. Toca el botón para descubrirlo.',
  recipient_name:     '',
  occasion:           'birthday',
  status:             'draft',

  bg_image:           null,
  bg_color:           '#0f0a1a',
  bg_overlay_opacity: 0.55,
  primary_color:      '#ff6b35',
  secondary_color:    '#ff8c5a',
  font_family:        'Playfair Display',
  font_size_title:    34,
  text_color:         '#ffffff',

  card_bg_color:      '#ffffff',
  card_opacity:       0.12,
  card_border_radius: 28,

  logo_url:           null,

  model_url:          'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  model_ios_url:      'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
  model_type:         '3d_glb',
  model_alt:          'Tu regalo en realidad aumentada',

  animation_name:     null,
  animation_autoplay: true,
  animation_loop:     true,
  animation_speed:    1,

  cta_text:           'Ver mi sorpresa',
  cta_color:          '#ff6b35',
  cta_text_color:     '#ffffff',
  cta_border_radius:  999,
  cta_icon:           'gift',
  cta_animation:      'pulse',

  ar_mode:            'hybrid',
  model_scale:        1,

  target_image_url:   null,
  target_mind_url:    null,

  confetti_enabled:   true,
  confetti_style:     'hearts',
  confetti_colors:    '',

  audio_url:             null,
  audio_autoplay:        false,
  audio_start_on_launch: true,
  voice_message_url:     null,

  frame_style:        'none',
  campaign_id:        null,
}
