import ImageGallery from '@/components/ImageGallery'

// DATOS DE EJEMPLO — reemplaza con tu API real
const mockPhotos = [
  { 
    id: '1', 
    file_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', 
    file_name: 'Ceremonia_001.jpg', 
    file_type: 'image/jpeg', 
    file_size: 2450000, 
    created_at: '2024-05-25T10:00:00Z' 
  },
  { 
    id: '2', 
    file_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80', 
    file_name: 'Ceremonia_002.jpg', 
    file_type: 'image/jpeg', 
    file_size: 1890000, 
    created_at: '2024-05-25T10:05:00Z' 
  },
  { 
    id: '3', 
    file_url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80', 
    file_name: 'Novios_001.jpg', 
    file_type: 'image/jpeg', 
    file_size: 2100000, 
    created_at: '2024-05-25T11:00:00Z' 
  },
  { 
    id: '4', 
    file_url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80', 
    file_name: 'Novios_002.jpg', 
    file_type: 'image/jpeg', 
    file_size: 1950000, 
    created_at: '2024-05-25T11:10:00Z' 
  },
  { 
    id: '5', 
    file_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', 
    file_name: 'Recepcion_001.jpg', 
    file_type: 'image/jpeg', 
    file_size: 2300000, 
    created_at: '2024-05-25T12:00:00Z' 
  },
  { 
    id: '6', 
    file_url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80', 
    file_name: 'Recepcion_002.jpg', 
    file_type: 'image/jpeg', 
    file_size: 1780000, 
    created_at: '2024-05-25T12:15:00Z' 
  },
  { 
    id: '7', 
    file_url: 'https://images.unsplash.com/photo-1544078751-58fee2b8a03b?w=800&q=80', 
    file_name: 'Detalles_001.jpg', 
    file_type: 'image/jpeg', 
    file_size: 1200000, 
    created_at: '2024-05-25T09:30:00Z' 
  },
  { 
    id: '8', 
    file_url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80', 
    file_name: 'Detalles_002.jpg', 
    file_type: 'image/jpeg', 
    file_size: 1350000, 
    created_at: '2024-05-25T09:45:00Z' 
  },
  { 
    id: '9', 
    file_url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80', 
    file_name: 'Familia_001.jpg', 
    file_type: 'image/jpeg', 
    file_size: 2500000, 
    created_at: '2024-05-25T13:00:00Z' 
  },
  { 
    id: '10', 
    file_url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80', 
    file_name: 'Familia_002.jpg', 
    file_type: 'image/jpeg', 
    file_size: 2200000, 
    created_at: '2024-05-25T13:20:00Z' 
  },
  { 
    id: '11', 
    file_url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&q=80', 
    file_name: 'Baile_001.jpg', 
    file_type: 'image/jpeg', 
    file_size: 1900000, 
    created_at: '2024-05-25T14:00:00Z' 
  },
  { 
    id: '12', 
    file_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 
    file_name: 'Baile_002.jpg', 
    file_type: 'image/jpeg', 
    file_size: 2050000, 
    created_at: '2024-05-25T14:15:00Z' 
  },
]

// Cuando tengas API real, descomenta esto:
// async function getPhotos(projectId: string) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/photos`, {
//     cache: 'no-store',
//   })
//   if (!res.ok) throw new Error('Failed to fetch photos')
//   return res.json()
// }

export default function ClientGalleryPage({ 
  params 
}: { 
  params: { projectId: string } 
}) {

  // const photos = await getPhotos(params.projectId)
  const photos = mockPhotos

  return (
    <ImageGallery 
      files={photos} 
      projectId={params.projectId} 
    />
  )
}