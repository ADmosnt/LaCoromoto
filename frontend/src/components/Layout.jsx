import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/productos', label: 'Productos' },
  { to: '/inventario', label: 'Inventario Central' },
  { to: '/ordenes', label: 'Órdenes de Despacho' },
  { to: '/historial', label: 'Historial' },
  { to: '/reportes-venta', label: 'Reportes de Venta' },
  { to: '/devoluciones', label: 'Devoluciones' },
  { to: '/stock', label: 'Stock en Consignación' },
]

const navLinkClass = ({ isActive }) =>
  `block px-4 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
  }`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
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
          <button
            className="md:hidden text-gray-400 hover:text-white text-lg leading-none"
            onClick={close}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={close}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700">
          <NavLink to="/configuracion" className={navLinkClass} onClick={close}>
            Configuración
          </NavLink>
        </div>
      </aside>

      {/* Content area */}
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
          <span className="font-semibold text-gray-800 text-sm">Sistema de Consignación</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
