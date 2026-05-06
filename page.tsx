// Redirige la raíz / al HTML estático en /public/inicio.html
// En Next.js, /public se sirve en la raíz del dominio automáticamente
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/inicio.html')
}
