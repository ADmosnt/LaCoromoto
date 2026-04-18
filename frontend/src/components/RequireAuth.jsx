import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ children, role }) {
  const { user } = useAuth()

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
  }

  if (!user) return <Navigate to="/login" replace />

  if (role && user.rol !== role) {
    return <Navigate to={user.rol === 'cliente' ? '/mis-ordenes' : '/dashboard'} replace />
  }

  return children
}
