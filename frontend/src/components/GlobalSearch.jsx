import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Package } from 'lucide-react'
import { getClientes, getProductos } from '../api'

const MAX_PER_CATEGORY = 5
const DEBOUNCE_MS = 250

export default function GlobalSearch({ onNavigate }) {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) { setClientes([]); setProductos([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const [cs, ps] = await Promise.all([
          getClientes({ search: q, activo: true }),
          getProductos({ search: q, activo: true }),
        ])
        setClientes(cs.data.slice(0, MAX_PER_CATEGORY))
        setProductos(ps.data.slice(0, MAX_PER_CATEGORY))
        setHighlight(0)
      } catch {
        setClientes([]); setProductos([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  // Click outside to close
  useEffect(() => {
    const handle = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const flat = [
    ...clientes.map((c) => ({ kind: 'cliente', id: c.id, label: c.razon_social, sub: c.codigo })),
    ...productos.map((p) => ({ kind: 'producto', id: p.id, label: p.descripcion, sub: p.codigo })),
  ]

  const selectItem = (item) => {
    if (!item) return
    setOpen(false)
    setQuery('')
    const path = item.kind === 'cliente' ? '/clientes' : '/productos'
    navigate(`${path}?search=${encodeURIComponent(item.label)}`)
    onNavigate?.()
  }

  const onKeyDown = (e) => {
    if (!open || flat.length === 0) {
      if (e.key === 'Escape') { setQuery(''); setOpen(false); inputRef.current?.blur() }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectItem(flat[highlight])
    } else if (e.key === 'Escape') {
      setQuery(''); setOpen(false); inputRef.current?.blur()
    }
  }

  const showDropdown = open && query.trim().length > 0
  const noResults = showDropdown && !loading && flat.length === 0

  return (
    <div ref={rootRef} className="relative px-3 py-2 border-b border-gray-700">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar cliente o producto..."
          className="w-full bg-gray-800 text-white placeholder-gray-400 text-sm rounded-md pl-8 pr-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white text-gray-800 rounded-md shadow-xl border border-gray-200 z-40 max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-3 py-3 text-xs text-gray-400">Buscando...</div>
          )}

          {noResults && (
            <div className="px-3 py-3 text-xs text-gray-400">Sin resultados</div>
          )}

          {!loading && clientes.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                <Users size={11} /> Clientes
              </div>
              {clientes.map((c, i) => {
                const flatIdx = i
                const active = highlight === flatIdx
                return (
                  <button
                    key={`c-${c.id}`}
                    onMouseEnter={() => setHighlight(flatIdx)}
                    onClick={() => selectItem(flat[flatIdx])}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className="font-medium truncate">{c.razon_social}</span>
                    <span className="font-mono text-xs text-gray-400 flex-shrink-0">{c.codigo}</span>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && productos.length > 0 && (
            <div className={clientes.length > 0 ? 'border-t border-gray-100' : ''}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                <Package size={11} /> Productos
              </div>
              {productos.map((p, i) => {
                const flatIdx = clientes.length + i
                const active = highlight === flatIdx
                return (
                  <button
                    key={`p-${p.id}`}
                    onMouseEnter={() => setHighlight(flatIdx)}
                    onClick={() => selectItem(flat[flatIdx])}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className="font-medium truncate">{p.descripcion}</span>
                    <span className="font-mono text-xs text-gray-400 flex-shrink-0">{p.codigo}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
