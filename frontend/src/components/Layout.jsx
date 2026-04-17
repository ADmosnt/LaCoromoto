import { Outlet, NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/productos', label: 'Productos' },
  { to: '/ordenes', label: 'Órdenes de Despacho' },
  { to: '/reportes-venta', label: 'Reportes de Venta' },
  { to: '/devoluciones', label: 'Devoluciones' },
  { to: '/stock', label: 'Stock en Consignación' },
  { to: '/configuracion', label: 'Configuración' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-base font-bold leading-tight">Sistema de<br />Consignación</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
