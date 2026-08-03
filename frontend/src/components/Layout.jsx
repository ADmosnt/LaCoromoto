import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlobalSearch from './GlobalSearch'
import AppHeader from './AppHeader'
import { resolveTitle } from '../lib/routeLabels'
import {
  LayoutDashboard, Users, Box, Warehouse, ClipboardList,
  RotateCcw, Archive, UserCog, Settings, LogOut,
} from 'lucide-react'

// Monograma de marca: tejita maíz con las iniciales en pino. Más propio que
// un ícono de stock, y reusable en sidebar, barra móvil y login.
function Monograma({ size = 'md' }) {
  const dims = size === 'lg' ? 'w-12 h-12 text-lg rounded-xl' : 'w-8 h-8 text-sm rounded-lg'
  return (
    <span className={`bg-llama-400 text-brand-900 font-display font-extrabold flex items-center justify-center flex-shrink-0 ${dims}`}>
      LC
    </span>
  )
}

const adminNav = [
  { to: '/dashboard',  label: 'Dashboard',             icon: LayoutDashboard },
  { to: '/clientes',   label: 'Clientes',               icon: Users },
  { to: '/productos',  label: 'Productos',              icon: Box },
  { to: '/inventario', label: 'Inventario Central',     icon: Warehouse },
  { to: '/ordenes',    label: 'Órdenes / Historial',    icon: ClipboardList },
  { to: '/devoluciones', label: 'Devoluciones',         icon: RotateCcw },
  { to: '/stock',      label: 'Stock en Consignación',  icon: Archive },
]

const clienteNav = [
  { to: '/mis-ordenes', label: 'Mis Órdenes', icon: ClipboardList },
]

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-brand-700 text-white border-l-[3px] border-llama-400'
      : 'text-gray-300 hover:bg-brand-800 hover:text-white border-l-[3px] border-transparent'
  }`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout, sessionWarning, resetTimer } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const close = () => setOpen(false)

  const isAdmin = user?.rol === 'admin'
  const navItems = isAdmin ? adminNav : clienteNav
  const initial = user?.username?.[0]?.toUpperCase() ?? '?'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-paper">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={close} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-56 bg-brand-900 text-white flex flex-col flex-shrink-0
          transition-transform duration-200
          md:relative md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-brand-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Monograma />
            <div className="leading-tight">
              <h1 className="font-display text-base font-bold">La Coromoto</h1>
              <p className="text-[10px] uppercase tracking-[0.14em] text-brand-200">Consignaciones</p>
            </div>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-white text-lg leading-none"
            onClick={close}
          >
            ✕
          </button>
        </div>

        {isAdmin && <GlobalSearch onNavigate={close} />}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={close}>
              <item.icon size={16} className="flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom admin links */}
        <div className="border-t border-brand-800">
          {isAdmin && (
            <>
              <NavLink to="/usuarios" className={navLinkClass} onClick={close}>
                <UserCog size={16} className="flex-shrink-0" />
                Usuarios
              </NavLink>
              <NavLink to="/configuracion" className={navLinkClass} onClick={close}>
                <Settings size={16} className="flex-shrink-0" />
                Configuración
              </NavLink>
            </>
          )}

          {/* User footer */}
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand-700 border border-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.rol}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-600 hover:text-gray-900 text-xl leading-none"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="font-display font-bold text-ink text-base tracking-tight">{resolveTitle(pathname)}</span>
        </header>

        {/* Desktop fixed header */}
        <AppHeader />

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
