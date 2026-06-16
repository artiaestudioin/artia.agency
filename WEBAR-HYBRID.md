# WebAR de Artia · Anclaje por marcador (MindAR) + celebración

Plataforma de regalos en realidad aumentada. El modelo 3D se **ancla a una imagen impresa**
(marcador) junto al QR, con confeti realista, música y mensaje de voz — todo dentro del
navegador y con control total. Se conserva un botón opcional de AR nativa para colocarlo sobre
una superficie real.

---

## 1. Cómo evolucionó

1. Primero: `model-viewer` entregaba la cámara a la AR del sistema → sin confeti/audio.
2. Luego: escena inmersiva en el navegador (cámara de fondo + modelo encima) → el modelo
   **flotaba** siguiendo la cámara, no quedaba fijo.
3. Ahora: **MindAR (rastreo de imagen)** → el modelo se **ancla sobre la imagen impresa** del
   regalo y se queda en su sitio; si apartas la cámara, desaparece. Con control total para confeti,
   audio y voz.

---

## 2. Flujo del cliente

```
Escanear QR  →  landing (mensaje personalizado, NO arranca AR)
   ↓ pulsa "Ver mi sorpresa"  (audio + voz arrancan con el gesto)
Cámara (MindAR) busca el marcador  →  hint con la imagen objetivo
   ↓ targetFound (apunta al marcador del regalo)
Modelo 3D ANCLADO sobre la imagen  +  entrada con GSAP (pop-in elástico + flotación)
   +  confeti realista (canvas-confetti)  +  música  +  mensaje de voz
   ↓ opcional
"Verlo sobre mi mesa"  →  AR nativa (Scene Viewer / Quick Look) sobre una superficie real
```

Si la experiencia **no tiene marcador compilado**, cae a un modo 3D sobre fondo de marca
(con confeti y el botón de AR nativa), para no quedar rota.

---

## 3. Arquitectura (archivos)

| Capa | Archivo | Rol |
|------|---------|-----|
| Tipos | `types/ar.ts` | `ARMode`, `ConfettiStyle` + campos de marcador/confeti/voz/escala |
| BD | `supabase/ar_migration_002.sql` · `ar_migration_003.sql` | Columnas nuevas |
| Celebración | `app/ar/[id]/_components/celebration.ts` | Carga por CDN de GSAP + canvas-confetti + A-Frame/MindAR; confeti tipo fuegos artificiales; entrada del modelo con GSAP |
| Cliente | `app/ar/[id]/_components/ARCustomerExperience.tsx` | Escena MindAR anclada + fallback 3D + AR nativa opcional |
| Editor | `app/admin/(protected)/ar/_components/ARExperienceEditor.tsx` | Secciones Marcador, Experiencia, Confeti, Audio (voz) + compilación `.mind` en navegador |
| API | `app/api/ar/upload/route.ts` | Soporte de audio `.m4a/.aac` y del archivo `.mind` |

Librerías cargadas **por CDN en runtime** (sin tocar `package.json`): GSAP 3.12, canvas-confetti 1.9,
A-Frame 1.5, aframe-extras 7.5, MindAR 1.2.

---

## 4. Modelo de datos · columnas nuevas (`ar_experiences`)

Migración **002**: `ar_mode`, `model_scale`, `confetti_enabled`, `confetti_style`,
`confetti_colors`, `voice_message_url`, `audio_start_on_launch`.

Migración **003**:

| Columna | Tipo | Uso |
|---------|------|-----|
| `target_image_url` | text | Imagen objetivo (se imprime junto al QR) |
| `target_mind_url` | text | Archivo `.mind` compilado para el rastreo |

Las filas existentes adoptan los defaults (modo `hybrid`, confeti `hearts`).

---

## 5. Despliegue — orden importante

1. Ejecuta en Supabase → SQL Editor, en orden:
   `supabase/ar_migration_002.sql`  y luego  `supabase/ar_migration_003.sql`.
   > Deben correr **antes** de desplegar el código.
2. Asegura el bucket `ar-assets` público (ya lo usa el upload).
3. Despliega (Next.js) y verifica en tu entorno:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

---

## 6. Editor — crear una experiencia anclada

1. **Contenido / Fondo / Card**: textos y branding.
2. **Modelo 3D**: sube `.glb`, `.gltf`, `.fbx`, `.obj` o `.stl` — los que no son glb se
   convierten a `.glb` automáticamente en el navegador. Sube también `.usdz` para la AR nativa en iOS.
3. **Marcador**:
   - Sube la **imagen objetivo** (foto/ilustración con detalle y contraste; el QR solo no sirve).
   - Pulsa **"Compilar marcador"** → genera el `.mind` en tu navegador y lo guarda.
4. **Experiencia**: motor `hybrid` (recomendado) y **escala del modelo** (con MindAR suele bajarse a
   ~0.2–0.5; el plano del marcador mide 1 unidad).
5. **Confeti**: estilo (corazones/clásico/estrellas/pétalos) y colores.
6. **Audio**: música de fondo + **mensaje de voz** + "iniciar al pulsar".
7. **Publicar**: genera URL pública y QR.

> En el regalo se imprimen **dos** cosas: el **QR** (abre la landing) y la **imagen objetivo**
> (sobre la que aparece el modelo). Pueden ir juntas en la misma tarjeta.

---

## 7. Notas técnicas y límites

- **MindAR** rastrea imágenes; funciona en Android e iOS (Safari) sobre **HTTPS** con permiso de
  cámara. MindAR gestiona la cámara (no abrimos `getUserMedia` aparte → sin conflictos).
- **Compilación `.mind` en navegador**: la imagen objetivo debe ser legible por CORS (las URLs
  públicas de Supabase lo permiten). Si falla, el editor muestra el error.
- **Escala del modelo**: un `.glb` grande puede verse enorme sobre el marcador; ajústalo en
  *Experiencia → escala* (rango 0.1–3×).
- **Confeti + GSAP**: el confeti usa canvas-confetti (físicas reales, formas por emoji) y GSAP
  orquesta la secuencia y la entrada del modelo (`back.out`, flotación en loop). Respeta
  `prefers-reduced-motion`.
- **AR nativa** (botón "Verlo sobre mi mesa"): usa `scene-viewer` (Android) / `quick-look` (iOS),
  requiere `.usdz` en iPhone. El botón por defecto de model-viewer está oculto.
- **Calidad del marcador**: imágenes con muchos detalles y bordes rastrean mejor que logos planos o
  zonas de color liso.
- **Formatos 3D**: el AR web solo renderiza glTF/glb, así que `.fbx/.obj/.stl` se convierten a `.glb`
  en el navegador con three.js (`model-convert.ts`) al subirlos. Caveats: el `.fbx` conserva
  geometría y animaciones embebidas (no efectos propietarios); el `.obj` solo trae geometría —
  sus texturas (`.mtl` + imágenes) no viajan en un único archivo, así que para texturas exporta a
  `.glb` desde tu herramienta 3D. Modelos muy pesados pueden tardar en convertir en móviles.
