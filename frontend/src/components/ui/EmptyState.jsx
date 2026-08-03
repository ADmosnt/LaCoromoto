export default function EmptyState({ icon: Icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon size={40} className="text-gray-300 mb-3" strokeWidth={1.5} />}
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  )
}
