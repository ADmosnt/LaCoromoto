import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-7xl font-bold text-gray-200">404</p>
      <p className="mt-4 text-lg text-gray-500">Página no encontrada</p>
      <Link to="/" className="mt-6 text-blue-600 hover:underline text-sm">
        Volver al inicio
      </Link>
    </div>
  )
}
