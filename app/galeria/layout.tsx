// Layout limpio para el portal del cliente (sin sidebar del admin)
export default function GalleryLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div style={{ minHeight: '100vh' }}>
      {children}
    </div>
  )
}