// ============================================================
// model-convert.ts
// Convierte modelos 3D (.fbx / .obj / .stl) a .glb en el navegador
// usando three.js (cargado por CDN). Los .glb/.gltf pasan sin tocar.
// Mantiene el pipeline AR (model-viewer / MindAR / Scene Viewer / Quick Look)
// que solo entiende glTF/glb.
// ============================================================

const THREE_VER = '0.147.0' // última versión con examples/js (loaders globales)
const BASE = `https://cdn.jsdelivr.net/npm/three@${THREE_VER}`

const SCRIPTS = {
  three:    `${BASE}/build/three.min.js`,
  fflate:   `${BASE}/examples/js/libs/fflate.min.js`,
  fbx:      `${BASE}/examples/js/loaders/FBXLoader.js`,
  obj:      `${BASE}/examples/js/loaders/OBJLoader.js`,
  stl:      `${BASE}/examples/js/loaders/STLLoader.js`,
  exporter: `${BASE}/examples/js/exporters/GLTFExporter.js`,
}

const loaded = new Map<string, Promise<void>>()
function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve()
  const cached = loaded.get(src)
  if (cached) return cached
  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.appendChild(s)
  })
  loaded.set(src, p)
  return p
}

function THREE(): any { return (window as any).THREE }

export const SUPPORTED_MODEL_EXTS = ['glb', 'gltf', 'fbx', 'obj', 'stl'] as const

export function extOf(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase()
}

// Convierte un File a .glb. Si ya es glb/gltf lo devuelve igual.
export async function convertToGlb(
  file: File,
  onStage?: (s: string) => void,
): Promise<File> {
  const ext = extOf(file.name)
  if (ext === 'glb' || ext === 'gltf') return file
  if (!(SUPPORTED_MODEL_EXTS as readonly string[]).includes(ext)) {
    throw new Error(`Formato no soportado: .${ext}`)
  }

  onStage?.('Cargando motor 3D…')
  await loadScript(SCRIPTS.three, () => !!THREE())

  let object3D: any
  if (ext === 'fbx') {
    onStage?.('Leyendo FBX…')
    await loadScript(SCRIPTS.fflate, () => !!(window as any).fflate)
    await loadScript(SCRIPTS.fbx, () => !!THREE().FBXLoader)
    const buffer = await file.arrayBuffer()
    object3D = new (THREE().FBXLoader)().parse(buffer, '')
  } else if (ext === 'obj') {
    onStage?.('Leyendo OBJ…')
    await loadScript(SCRIPTS.obj, () => !!THREE().OBJLoader)
    const text = await file.text()
    object3D = new (THREE().OBJLoader)().parse(text)
  } else if (ext === 'stl') {
    onStage?.('Leyendo STL…')
    await loadScript(SCRIPTS.stl, () => !!THREE().STLLoader)
    const buffer = await file.arrayBuffer()
    const geometry = new (THREE().STLLoader)().parse(buffer)
    const material = new (THREE().MeshStandardMaterial)({ color: 0xcfcfcf, metalness: 0.1, roughness: 0.8 })
    object3D = new (THREE().Mesh)(geometry, material)
  }

  if (!object3D) throw new Error('No se pudo interpretar el modelo')

  onStage?.('Exportando a GLB…')
  await loadScript(SCRIPTS.exporter, () => !!THREE().GLTFExporter)

  const glbBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
    try {
      new (THREE().GLTFExporter)().parse(
        object3D,
        (result: ArrayBuffer) => resolve(result),
        (err: any) => reject(err instanceof Error ? err : new Error('Error al exportar GLB')),
        { binary: true, animations: object3D.animations ?? [], onlyVisible: false },
      )
    } catch (e) { reject(e) }
  })

  const base = file.name.replace(/\.[^.]+$/, '')
  return new File([glbBuffer], `${base}.glb`, { type: 'model/gltf-binary' })
}
