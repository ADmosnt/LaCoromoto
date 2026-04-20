import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlobalSearch from './GlobalSearch'

const adminNav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/productos', label: 'Productos' },
  { to: '/inventario', label: 'Inventario Central' },
  { to: '/ordenes', label: 'Órdenes / Historial' },
  { to: '/devoluciones', label: 'Devoluciones' },
  { to: '/stock', label: 'Stock en Consignación' },
]

const clienteNav = [
  { to: '/mis-ordenes', label: 'Mis Órdenes' },
]

const navLinkClass = ({ isActive }) =>
  `block px-4 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
  }`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout, sessionWarning, resetTimer } = useAuth()
  const navigate = useNavigate()
  const close = () => setOpen(false)

  const isAdmin = user?.rol === 'admin'
  const navItems = isAdmin ? adminNav : clienteNav

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={close} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-56 bg-gray-900 text-white flex flex-col flex-shrink-0
          transition-transform duration-200
          md:relative md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h1 className="text-base font-bold leading-tight">
            Sistema de<br />Consignación
          </h1>
          <button className="md:hidden text-gray-400 hover:text-white text-lg leading-none" onClick={close}>✕</button>
        </div>

        {isAdmin && <GlobalSearch onNavigate={close} />}

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={close}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700">
          {isAdmin && (
            <>
              <NavLink to="/usuarios" className={navLinkClass} onClick={close}>Usuarios</NavLink>
              <NavLink to="/configuracion" className={navLinkClass} onClick={close}>Configuración</NavLink>
            </>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-white ml-2 flex-shrink-0"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-gray-600 hover:text-gray-900 text-xl leading-none" aria-label="Abrir menú">
            ☰
          </button>
          <span className="font-semibold text-gray-800 text-sm">Sistema de Consignación</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {sessionWarning && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-yellow-800">Tu sesión expirará en 1 minuto por inactividad.</span>
              <button
                onClick={resetTimer}
                className="text-yellow-700 font-semibold hover:underline ml-4 flex-shrink-0"
              >
                Mantener sesión
              </button>
            </div>
          )}
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
