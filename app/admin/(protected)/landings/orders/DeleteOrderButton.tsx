'use client'

import { useState } from 'react'

interface DeleteOrderButtonProps {
  orderId: string
  deleteAction: (formData: FormData) => Promise<void>
}

export function DeleteOrderButton({ orderId, deleteAction }: DeleteOrderButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <form action={deleteAction} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={orderId} />
      <button
        type="submit"
        formAction={deleteAction}
        onClick={(e) => {
          if (!confirm('¿Eliminar este pedido permanentemente?')) {
            e.preventDefault()
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: 11,
          color: '#ef4444',
          background: hovered ? '#fee2e2' : '#fef2f2',
          padding: '4px 10px',
          borderRadius: 6,
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        🗑️ Eliminar
      </button>
    </form>
  )
}