import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────
const CONFIG = {
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatModel: process.env.GROQ_MODEL || 'llama3-8b-8192',
    // Groq Whisper nativo — mucho más confiable que Hugging Face
    whisperModel: 'whisper-large-v3-turbo',
  },
  systemPrompt: `Rol:
Eres Artia AI, el asistente estratégico y comercial de Artia Studio en Ecuador. Tu objetivo principal NO es solo responder preguntas, sino convertir conversaciones en clientes potenciales reales.

Objetivo:
Entender el proyecto del usuario, detectar automáticamente el servicio ideal, generar interés profesional y obtener datos básicos de contacto de manera natural antes de conectar al usuario con un asesor humano.

Personalidad:
Creativa, moderna, estratégica, segura y profesional. Hablas como una agencia premium especializada en crecimiento visual y digital de marcas.

Estilo de conversación:
- Respuestas cortas de máximo 1-2 líneas.
- Conversación natural y humana.
- Nunca sonar robótico.
- Nunca hablar como soporte técnico.
- Hablar siempre orientado a resultados.
- Generar interés comercial progresivamente.
- Mantener fluidez y cero fricción.

Flujo obligatorio:
1. Saludar y preguntar sobre el proyecto o necesidad.
2. Detectar automáticamente el servicio ideal.
3. Recomendar el servicio de forma estratégica y profesional si lo piden.
4. Generar interés en mejorar su marca o negocio.
5. Pedir el nombre de forma natural.
6. Pedir número de contacto explicando que así un asesor podrá enviarle información más precisa.
7. Pedir correo electrónico opcionalmente.
8. Finalmente preguntar si desea hablar con un asesor humano.

Importante:
- NO mostrar WhatsApp inmediatamente.
- NO pedir todos los datos al inicio.
- NO usar listas largas.
- NO responder extremadamente largo.
- NO decir que eres una IA.

Persuasión:
Usa frases como:
- "Eso podría potenciar muchísimo tu marca."
- "Tu proyecto tiene mucho potencial visual y comercial."
- "Podemos ayudarte a que se vea mucho más profesional."
- "Ahí podríamos trabajar una estrategia bastante sólida."

Servicios Artia:
- Branding y diseño de marca.
- Redes sociales y campañas ADS.
- Fotografía y video profesional.
- Producción audiovisual y drone.
- Páginas web y landing pages.
- Impresión y material publicitario.
- Estrategias digitales y posicionamiento.

Precios:

IMPORTANTE:
- NO asumir precios.
- NO inventar precios.
- NO reutilizar los precios de redes sociales o páginas web para otros servicios.

SOLO puedes mencionar:

• Redes sociales desde $300.
• Landing pages o páginas web desde $350.

Ejemplos:
- Si preguntan por redes sociales → mencionar desde $300.
- Si preguntan por páginas web → mencionar desde $350.

Para TODO lo demás:
- tarjetas
- logos
- branding
- impresión
- gigantografías
- fotografía
- videos
- drone
- merchandising
- packaging
- sublimación
- publicidad física
- cualquier otro servicio

Responder:
"Ese servicio lo cotizamos según cantidad, diseño y producción. Podemos ayudarte con una propuesta mucho más precisa según lo que necesitas."

Si el usuario insiste en precio:
"Te recomiendo hablar con un asesor para enviarte una cotización exacta según tu proyecto. 👇"

NUNCA:
- decir "desde $300" para servicios que no sean redes sociales.
- decir "desde $350" para servicios que no sean páginas web o landing pages.
- estimar precios automáticamente.

Fuera de alcance:
Si el usuario pide algo no relacionado responder:
"En Artia nos enfocamos en potenciar marcas y negocios con soluciones visuales y digitales. ¿Te ayudamos con tu proyecto mejor?"

Reglas para WhatsApp:
SOLO mostrar [SHOW_WHATSAPP_BUTTON] cuando:
- El usuario ya entregó mínimo nombre y teléfono.
- O insiste directamente en hablar con alguien.

Si el usuario pide hablar con un asesor antes de dar datos:
- Primero pedir el nombre.
- Luego pedir número de contacto.
- Después continuar con el formato obligatorio.

Formato obligatorio antes de WhatsApp:

Antes de mostrar [SHOW_WHATSAPP_BUTTON], SIEMPRE debes generar un resumen corto y profesional.

Usar EXACTAMENTE este formato:

Resumen de tu solicitud:
• Servicio: [servicio detectado]
• Cliente: [nombre]
• Objetivo: [resumen breve]
• Contacto: [teléfono]

Luego escribir:
"Perfecto, un asesor de Artia Studio ya puede ayudarte con una propuesta más precisa. 👇"

Y DESPUÉS mostrar:
[SHOW_WHATSAPP_BUTTON]

IMPORTANTE:
- Nunca mostrar WhatsApp sin el resumen.
- El resumen debe ser breve y profesional.
- Nunca repetir preguntas si ya tienes los datos.
- Si falta nombre o teléfono, seguir guiando la conversación hasta obtenerlos.`,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, details: details || null },
    { status, headers: corsHeaders }
  )
}

function successResponse(data: unknown, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, { status: 200, headers: { ...corsHeaders, ...extraHeaders } })
}

// ─────────────────────────────────────────
// OPTIONS (CORS PREFLIGHT)
// ─────────────────────────────────────────
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// ─────────────────────────────────────────
// TRANSCRIPCIÓN CON GROQ WHISPER
// (reemplaza Hugging Face — más confiable y sin 404s)
// ─────────────────────────────────────────
async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  // Groq Whisper acepta: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
  // El browser graba en audio/webm;codecs=opus — Groq lo acepta nativamente.

  const formData = new FormData()

  // Detectar extensión desde el mimeType
  let extension = 'webm'
  if (mimeType.includes('wav')) extension = 'wav'
  else if (mimeType.includes('mp4') || mimeType.includes('m4a')) extension = 'm4a'
  else if (mimeType.includes('ogg')) extension = 'ogg'
  else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) extension = 'mp3'

  const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' })
  formData.append('file', blob, `recording.${extension}`)
  formData.append('model', CONFIG.groq.whisperModel)
  formData.append('language', 'es') // Forzar español para mejor precisión
  formData.append('response_format', 'json')

  const response = await fetch(`${CONFIG.groq.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.groq.apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Groq Whisper error ${response.status}: ${JSON.stringify(err)}`)
  }

  const result = await response.json()

  if (!result.text || result.text.trim().length === 0) {
    throw new Error('No se detectó texto en el audio')
  }

  return result.text.trim()
}

// ─────────────────────────────────────────
// CHAT CON GROQ
// ─────────────────────────────────────────
async function chatWithGroq(
  messages: Array<{ role: string; content: string }>,
  stream = false
) {
  const response = await fetch(`${CONFIG.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CONFIG.groq.chatModel,
      messages: [{ role: 'system', content: CONFIG.systemPrompt }, ...messages],
      stream,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Groq error: ${JSON.stringify(err)}`)
  }

  return response
}

// ─────────────────────────────────────────
// ENDPOINT: CHAT (POST)
// ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!CONFIG.groq.apiKey) {
    return errorResponse('GROQ_API_KEY no configurada', 500)
  }

  let body: { messages?: Array<{ role: string; content: string }>; stream?: boolean }

  try {
    body = await req.json()
  } catch {
    return errorResponse('JSON inválido', 400)
  }

  const { messages, stream = false } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse('Se requiere array de messages', 400)
  }

  try {
    const groqRes = await chatWithGroq(messages, stream)

    if (stream && groqRes.body) {
      return new Response(groqRes.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const data = await groqRes.json()
    return successResponse(data)
  } catch (err) {
    console.error('[Chat Error]', err)
    return errorResponse('Error en el chat', 500, err instanceof Error ? err.message : err)
  }
}

// ─────────────────────────────────────────
// ENDPOINT: AUDIO (PUT)
// ─────────────────────────────────────────
export async function PUT(req: NextRequest) {
  if (!CONFIG.groq.apiKey) {
    return errorResponse('GROQ_API_KEY no configurada', 500)
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const stream = formData.get('stream') === 'true'
    const historyRaw = formData.get('messages') as string | null

    if (!audioFile) {
      return errorResponse('Se requiere archivo de audio', 400)
    }

    console.log('[Audio] Recibido:', audioFile.name, audioFile.type, audioFile.size, 'bytes')

    const audioBuffer = await audioFile.arrayBuffer()

    let transcribedText: string
    try {
      // ✅ Usar Groq Whisper en lugar de Hugging Face
      transcribedText = await transcribeAudio(audioBuffer, audioFile.type)
      console.log('[Audio] Transcrito con Groq Whisper:', transcribedText)
    } catch (err) {
      console.error('[Audio] Error transcripción:', err)
      return errorResponse(
        'Error al transcribir el audio. Intenta con un audio más corto o claro.',
        502,
        err instanceof Error ? err.message : err
      )
    }

    if (!transcribedText || transcribedText.trim().length === 0) {
      return errorResponse('No se detectó texto en el audio', 422)
    }

    let messages: Array<{ role: string; content: string }> = []
    if (historyRaw) {
      try {
        const parsed = JSON.parse(historyRaw)
        if (Array.isArray(parsed)) messages = parsed
      } catch {
        // Ignorar
      }
    }

    messages.push({ role: 'user', content: transcribedText })

    const groqRes = await chatWithGroq(messages, stream)

    if (stream && groqRes.body) {
      return new Response(groqRes.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Transcribed-Text': encodeURIComponent(transcribedText),
        },
      })
    }

    const chatData = await groqRes.json()

    return successResponse({
      ...chatData,
      _meta: {
        transcribed_text: transcribedText,
        source: 'groq',
        model: CONFIG.groq.whisperModel,
      },
    })
  } catch (err) {
    console.error('[Audio Error]', err)
    return errorResponse('Error al procesar audio', 500, err instanceof Error ? err.message : err)
  }
}

// ─────────────────────────────────────────
// ENDPOINT: HEALTH
// ─────────────────────────────────────────
export async function GET() {
  return successResponse({
    status: 'ok',
    service: 'artia-chat-api',
    version: '2.2.0',
    features: { chat: true, streaming: true, audio: true },
    config: {
      chat_model: CONFIG.groq.chatModel,
      whisper_model: CONFIG.groq.whisperModel,
      whisper_provider: 'groq',
    },
  })
}