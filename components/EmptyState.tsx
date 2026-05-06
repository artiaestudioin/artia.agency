export default function EmptyState({ icon, title, action }: { icon: string; title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-lg font-medium">{title}</p>
      {action && (
        <a href={action.href} className="mt-4 text-blue-600 hover:underline">
          {action.label}
        </a>
      )}
    </div>
  )
}