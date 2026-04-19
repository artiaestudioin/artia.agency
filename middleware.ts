import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any) {
          // 1. Actualizamos los cookies en la petición original
          cookiesToSet.forEach(({ name, value }: any) =>
            request.cookies.set(name, value)
          )
          // 2. Sincronizamos la respuesta
          supabaseResponse = NextResponse.next({ request })
          // 3. AGREGADO: :any para corregir el error de Vercel
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión — obligatorio en middleware con Supabase SSR
  // Usar getUser() es lo más seguro según la documentación
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAdminRoute = path.startsWith('/admin')
  const isLoginPage  = path === '/admin/login'

  // Lógica de Redirección
  if (isAdminRoute && !isLoginPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Ajuste opcional: es mejor proteger todo /admin incluyendo el login 
  // para que el middleware gestione la redirección si ya hay sesión.
  matcher: ['/admin/:path*'],
}