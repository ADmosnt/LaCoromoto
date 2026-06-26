import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getTasaHoy } from '../api'

const ROUTE_LABELS = {
  '/dashboard':    'Dashboard',
  '/clientes':     'Clientes',
  '/productos':    'Productos',
  '/inventario':   'Inventario Central',
  '/ordenes':      'Órdenes',
  '/devoluciones': 'Devoluciones',
  '/stock':        'Stock en Consignación',
  '/reportes-venta': 'Reportes de Venta',
  '/configuracion': 'Configuración',
  '/usuarios':     'Usuarios',
  '/mis-ordenes':  'Mis Órdenes',
}

function resolveBreadcrumb(pathname) {
  // Exact match
  if (ROUTE_LABELS[pathname]) return [{ label: ROUTE_LABELS[pathname] }]

  // Try /section/:id pattern
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length >= 2) {
    const base = `/${parts[0]}`
    const baseLabel = ROUTE_LABELS[base]
    if (baseLabel) {
      return [
        { label: baseLabel, href: base },
        { label: `#${parts[1]}` },
      ]
    }
  }

  return [{ label: pathname }]
}

export default function AppHeader() {
  const { pathname } = useLocation()
  const [tasa, setTasa] = useState(null)
  const crumbs = resolveBreadcrumb(pathname)

  useEffect(() => {
    getTasaHoy()
      .then((r) => setTasa(r.data))
      .catch(() => setTasa(null))
  }, [])

  return (
    <header className="hidden md:flex h-14 bg-white border-b border-gray-200 items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <span className={i === crumbs.length - 1 ? 'font-semibold text-gray-800' : 'text-gray-400'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* BCV chip */}
      {tasa && (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-1.5">
          <span className="text-xs text-brand-600 font-medium">
            Bs. {Number(tasa.valor).toFixed(2)}
          </span>
          <span className="text-xs text-gray-400">hoy</span>
        </div>
      )}
    </header>
  )
}
