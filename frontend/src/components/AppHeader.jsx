import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getTasaHoy } from '../api'
import { resolveBreadcrumb } from '../lib/routeLabels'
import TasaBoard from './ui/TasaBoard'

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
      {/* Breadcrumb — único título de la vista en desktop */}
      <nav className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <span className={i === crumbs.length - 1
              ? 'font-display font-bold text-ink text-base tracking-tight'
              : 'text-gray-400 text-sm'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Firma: tasa del día */}
      {tasa && <TasaBoard valor={tasa.valor} />}
    </header>
  )
}
