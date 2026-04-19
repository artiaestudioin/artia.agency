import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // Busca esta línea y agrégale el tipo ": any" (o el tipo específico de Supabase)
setAll(cookiesToSet: any) { 
  try {
    cookiesToSet.forEach(({ name, value, options }: any) =>
      cookieStore.set(name, value, options)
    )
  } catch {
    // El manejo de cookies en Server Components a veces falla si no se envuelve en try-catch
  }
        },
      },
    }
  )
}
