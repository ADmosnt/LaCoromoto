import { Link } from 'react-router-dom'

export default function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {action && (
        <Link
          to={action.to}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
