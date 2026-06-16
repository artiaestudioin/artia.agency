# WebAR de Artia · regalo en realidad aumentada

Plataforma de regalos AR. El cliente escanea un QR, lee un mensaje personalizado con confeti,
música y voz, y coloca el modelo 3D **anclado sobre una superficie real** con la AR del navegador
(WebXR) o del sistema (Scene Viewer / Quick Look). **Sin marcador ni imagen impresa.**

---

## 1. Enfoque actual (WebXR markerless)

El AR lo maneja **`model-viewer`** con `ar-modes="webxr scene-viewer quick-look"`:

- **Android moderno** → **WebXR** dentro del navegador: detecta una superficie con un retículo,
  ancla el regalo ahí y el cliente se mueve a su alrededor (se queda fijo).
- **iPhone** → **Quick Look** (AR nativa). Requiere el `.usdz`.
- **Sin AR** (escritorio) → el modelo se ve y gira en 3D.

La cámara la gestiona el sistema/WebXR, así que **no hay permisos web frágiles ni `getUserMedia`
propio**. El confeti, la música y el mensaje de voz van en la **pantalla de celebración** (no
encima de la cámara, porque la sesión AR es del sistema).

> Por qué no MindAR / cámara propia: la cámara dentro del navegador con `getUserMedia` daba
> problemas de permisos y pantallas negras, y el marcador impreso añadía fricción. WebXR + nativo
> es lo robusto y multiplataforma.

---

## 2. Flujo del cliente

```
Escanear QR  →  landing (mensaje personalizado, NO arranca nada)
   ↓ pulsa "Ver mi sorpresa"   (confeti + música + voz, con el gesto del usuario)
Pantalla de celebración: modelo 3D + confeti realista (GSAP / canvas-confetti)
   ↓ pulsa "Ver en mi espacio"
AR: WebXR (Android, en el navegador) · Quick Look (iPhone) → coloca el regalo en una superficie
```

---

## 3. Arquitectura (archivos)

| Capa | Archivo | Rol |
|------|---------|-----|
| Tipos | `types/ar.ts` | Campos de branding, confeti, audio/voz, modelo |
| BD | `supabase/ar_migration_00{1,2,3}.sql` | Columnas de las experiencias |
| Celebración | `app/ar/[id]/_components/celebration.ts` | GSAP + canvas-confetti (por CDN); confeti tipo fuegos artificiales |
| Cliente | `app/ar/[id]/_components/ARCustomerExperience.tsx` | Mensaje → celebración → AR (model-viewer WebXR / nativo) |
| Editor | `app/admin/(protected)/ar/_components/ARExperienceEditor.tsx` | Crea/edita experiencias, QR, confeti, audio/voz, modelo 3D |
| Conversión 3D | `app/admin/(protected)/ar/_components/model-convert.ts` | `.fbx/.obj/.stl` → `.glb` en el navegador (three.js) |

---

## 4. Editor — crear una experiencia

1. **Contenido / Fondo / Card**: textos y branding.
2. **Modelo 3D**: sube `.glb`, `.gltf`, `.fbx`, `.obj` o `.stl` (los no-glb se convierten solos).
   Sube también `.usdz` para la AR de iPhone.
3. **Confeti**: estilo (corazones/clásico/estrellas/pétalos) y colores.
4. **Audio**: música de fondo + mensaje de voz + "iniciar al pulsar".
5. **Botón**: texto, color, ícono, animación.
6. **Publicar**: genera URL pública y QR. En el regalo se imprime **solo el QR**.

> La pestaña **Marcador** es **opcional** (modo avanzado con imagen impresa / MindAR). El AR normal
> no la necesita.

---

## 5. Despliegue

1. Migraciones en Supabase → SQL Editor: `ar_migration_001/002/003.sql`.
2. Bucket `ar-assets` público.
3. **iPhone**: para la AR nativa, cada modelo necesita su `.usdz` además del `.glb`.
4. Verifica en tu entorno: `npx tsc --noEmit` y `npm run build`.

---

## 6. Notas y límites

- **Probar en teléfono real.** El AR (WebXR / Quick Look) no funciona en el modo responsive de
  escritorio; ahí solo verás el 3D.
- **HTTPS obligatorio** para AR.
- **WebXR** requiere Android con ARCore (Chrome). Sin él, `model-viewer` cae a Scene Viewer o, si
  tampoco, muestra el 3D.
- **Confeti/audio/voz** se disparan con el gesto de "Ver mi sorpresa" (evita el bloqueo de autoplay
  móvil) y viven en la pantalla de celebración.
- **Formatos 3D**: el AR web solo renderiza glTF/glb; `.fbx/.obj/.stl` se convierten a `.glb` con
  three.js. El `.obj` no trae sus texturas (van en archivos aparte) — para texturas, exporta a `.glb`.
- **Marcador (MindAR)**: queda disponible como modo avanzado, pero no se usa en el flujo normal.
