# WebAR Híbrido · Módulo de regalos AR de Artia

Corrección del módulo y la nueva interfaz para que la experiencia tenga **control total**
(cámara dentro del navegador + confeti + audio + mensaje de voz), sin perder la opción de
AR nativa sobre una superficie real.

---

## 1. El problema que se corrigió

El `model-viewer` anterior, al pulsar el botón, **entregaba la experiencia a la AR del sistema**
(Scene Viewer en Android / Quick Look en iOS). En ese momento se pierde el control: no se puede
poner confeti, audio sincronizado ni mensaje de voz encima de la cámara.

La solución es un **motor híbrido**:

- **Inmersiva (en el navegador):** la cámara real se usa como fondo (`getUserMedia`), el modelo
  3D se renderiza encima con `model-viewer` en modo transparente, y sobre todo eso van el confeti
  (canvas), la música y la voz. Control total.
- **Nativa (opcional):** un botón *"Verlo sobre mi mesa"* llama a `activateAR()` para anclar el
  modelo a una superficie real cuando el usuario lo quiere.

Se preserva `model-viewer` (requisito del proyecto): se usa tanto para el render 3D en la escena
inmersiva como para la AR nativa.

---

## 2. Flujo del cliente (mapeado a tu diagrama)

```
Escanear QR
  ↓
Abrir landing web                 → app/ar/[id]/page.tsx (lee la experiencia activa)
  ↓
Mostrar mensaje personalizado     → Pantalla 1 (hero + mensaje, NO arranca AR)
  ↓
Pulsar "Ver mi sorpresa"          → handleLaunch()
  ↓
Solicitar permisos de cámara      → getUserMedia({ facingMode: 'environment' })  · SOLO al pulsar
  ↓
Abrir cámara dentro del navegador → <video> de fondo (object-fit: cover)
  ↓
Mostrar modelo 3D en WebAR        → <model-viewer> transparente encima
  ↓
Reproducir audio + voz            → música en loop + mensaje de voz (1 vez), dentro del gesto
  ↓
Activar confeti                   → canvas (corazones / clásico / estrellas / pétalos)
  ↓
Mantener control total            → chrome propio: cerrar, repetir confeti, "verlo sobre mi mesa"
```

Si el usuario **niega la cámara**, la escena cae con elegancia a 3D sobre el fondo de marca
(sigue habiendo modelo + confeti + audio + voz).

---

## 3. Arquitectura (archivos tocados)

| Capa | Archivo | Cambio |
|------|---------|--------|
| Tipos | `types/ar.ts` | `ARMode`, `ConfettiStyle` + campos nuevos en `ARExperience`, `UpdateARExperienceInput` y `DEFAULT_AR_EXPERIENCE` |
| BD | `supabase/ar_migration_002.sql` | Columnas nuevas + constraints |
| Cliente | `app/ar/[id]/_components/ARCustomerExperience.tsx` | Reescrito: flujo híbrido, cámara, confeti canvas, audio/voz sincronizados, AR nativa opcional |
| Editor | `app/admin/(protected)/ar/_components/ARExperienceEditor.tsx` | Secciones nuevas **Experiencia** y **Confeti**, **Audio** ampliado (voz + audio al pulsar), preview con chips de configuración |
| API | `app/api/ar/upload/route.ts` | Soporte de `.m4a` / `.aac` para el mensaje de voz |

La API de experiencias (`POST` / `PATCH`) ya propaga cualquier campo nuevo, así que no requirió
cambios de lógica más allá de los tipos.

---

## 4. Modelo de datos · columnas nuevas (`ar_experiences`)

| Columna | Tipo | Default | Uso |
|---------|------|---------|-----|
| `ar_mode` | text | `hybrid` | `immersive` · `native` · `hybrid` |
| `model_scale` | numeric | `1.0` | Escala del modelo en la escena inmersiva |
| `confetti_enabled` | boolean | `true` | Activa/desactiva el confeti |
| `confetti_style` | text | `hearts` | `classic` · `hearts` · `stars` · `petals` |
| `confetti_colors` | text | `''` | Lista hex separada por comas; vacío = primario/secundario |
| `voice_message_url` | text | `null` | Mensaje de voz (1 reproducción al abrir) |
| `audio_start_on_launch` | boolean | `true` | Inicia la música con el gesto del usuario (evita bloqueo móvil) |

Las filas existentes adoptan los defaults automáticamente: pasan a **híbrida con confeti** sin
romper nada.

---

## 5. Despliegue — orden importante

1. **Ejecuta primero la migración** en Supabase → SQL Editor:
   `supabase/ar_migration_002.sql`
   > Debe correr **antes** de desplegar el código. La creación/guardado de experiencias inserta
   > los campos nuevos; sin las columnas, esos `INSERT`/`UPDATE` fallarían.
2. Despliega el código (Next.js).
3. Verifica en tu entorno:
   ```bash
   npx tsc --noEmit        # chequeo de tipos
   npm run build           # build de producción
   ```
   (En este entorno no pude correr el compilador de forma fiable por un desfase de la copia en
   el sandbox; los archivos reales quedaron revisados y balanceados.)

---

## 6. Editor — qué cambió para el administrador

- **Experiencia** (✦): elige el motor AR (Híbrida / Inmersiva / Nativa) y la escala del modelo.
- **Confeti** (🎉): activar, estilo y colores.
- **Audio** (🎵): música de fondo + **"iniciar al pulsar el botón"** + **mensaje de voz** (subida
  de archivo o URL).
- **Preview** en vivo: muestra chips con la configuración elegida (modo, confeti, voz, música) y
  un guiño del estilo de confeti.

Cada experiencia mantiene su propia configuración y su QR ligado a un único `slug` público
(`/ar/[slug]`), como ya hacía el dashboard.

---

## 7. Notas técnicas y límites

- **iOS Safari:** la escena inmersiva (cámara + modelo + confeti + voz) funciona sobre HTTPS. Para
  anclar a una superficie real, iOS usa **Quick Look**, que exige el `.usdz` (campo `model_ios_url`).
- **Confeti:** implementado en canvas, sin dependencias, respeta `prefers-reduced-motion`.
- **Audio/voz:** se disparan dentro del gesto de "Ver mi sorpresa" para sortear el bloqueo de
  autoplay de los navegadores móviles.
- **`model-viewer`:** se conserva como render 3D (fondo transparente sobre la cámara) y como vía a
  la AR nativa. El botón nativo solo aparece si el dispositivo soporta AR (`canActivateAR`).
- **HTTPS obligatorio** para cámara y AR.
