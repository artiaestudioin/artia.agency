// Layout raíz de /admin — SIN chequeo de autenticación.
// El auth check está en app/admin/(protected)/layout.tsx
// Esto evita el bucle infinito cuando un usuario no autenticado
// accede a /admin/login (el layout redirigía a /admin/login → loop).
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
