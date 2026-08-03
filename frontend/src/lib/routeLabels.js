// Fuente única de los nombres de vista. El header (breadcrumb en desktop,
// barra superior en móvil) los refleja, para no duplicar el título dentro
// de cada página.
export const ROUTE_LABELS = {
  '/dashboard':      'Dashboard',
  '/clientes':       'Clientes',
  '/productos':      'Productos',
  '/inventario':     'Inventario Central',
  '/ordenes':        'Órdenes',
  '/devoluciones':   'Devoluciones',
  '/stock':          'Stock en Consignación',
  '/reportes-venta': 'Reportes de Venta',
  '/configuracion':  'Configuración',
  '/usuarios':       'Usuarios',
  '/mis-ordenes':    'Mis Órdenes',
  '/historial':      'Historial',
}

export function resolveBreadcrumb(pathname) {
  if (ROUTE_LABELS[pathname]) return [{ label: ROUTE_LABELS[pathname] }]

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
  return [{ label: ROUTE_LABELS[`/${parts[0]}`] ?? 'La Coromoto' }]
}

// Título plano (última miga) para la barra móvil.
export function resolveTitle(pathname) {
  const crumbs = resolveBreadcrumb(pathname)
  return crumbs[crumbs.length - 1].label
}
