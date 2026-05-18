import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const displayLabel = (p) => p ? `${p.codigo} — ${p.descripcion}` : ''

export default function ProductoCombobox({
  productos,
  selectedId,
  onSelect,
  placeholder = 'Código o descripción...',
  size = 'normal',
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [dropStyle, setDropStyle] = useState({})
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const selected = productos.find((p) => String(p.id) === String(selectedId))

  useEffect(() => {
    if (!open) setQuery(displayLabel(selected))
  }, [selectedId, productos.length, open])

  const updateDropPosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropStyle({
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      pointerEvents: 'auto',
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updateDropPosition()
    window.addEventListener('scroll', updateDropPosition, true)
    window.addEventListener('resize', updateDropPosition)
    return () => {
      window.removeEventListener('scroll', updateDropPosition, true)
      window.removeEventListener('resize', updateDropPosition)
    }
  }, [open, updateDropPosition])

  useEffect(() => {
    const handleClick = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) {
        setOpen(false)
        setQuery(displayLabel(selected))
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selected])

  const q = query.toLowerCase().trim()
  const isShowingSelectedLabel = selected && query === displayLabel(selected)
  const filtered = (!q || isShowingSelectedLabel)
    ? productos
    : productos.filter((p) =>
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q)
      )

  const limitedList = filtered.slice(0, 50)

  const select = (p) => {
    onSelect(p.id)
    setQuery(displayLabel(p))
    setOpen(false)
  }

  const clear = () => {
    onSelect('')
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, limitedList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && limitedList[highlight]) {
        e.preventDefault()
        select(limitedList[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(displayLabel(selected))
    } else if (e.key === 'Tab') {
      const exact = limitedList.find((p) => (p.codigo || '').toLowerCase() === q)
      if (exact) select(exact)
      else setOpen(false)
    }
  }

  const inputClass = size === 'small'
    ? 'border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500'
    : 'w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const dropdown = open && (limitedList.length > 0 || (q.length > 0 && !isShowingSelectedLabel)) && createPortal(
    <div ref={listRef} style={dropStyle}>
      {limitedList.length > 0 ? (
        <ul className="bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto text-sm">
          {limitedList.map((p, idx) => (
            <li
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); select(p) }}
              onMouseEnter={() => setHighlight(idx)}
              className={`px-3 py-1.5 cursor-pointer flex items-baseline gap-2 ${idx === highlight ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="font-mono text-xs text-gray-500 flex-shrink-0">{p.codigo}</span>
              <span className="text-gray-800">{p.descripcion}</span>
            </li>
          ))}
          {filtered.length > limitedList.length && (
            <li className="px-3 py-1 text-xs text-gray-400 text-center italic border-t">
              … {filtered.length - limitedList.length} más. Refina la búsqueda.
            </li>
          )}
        </ul>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400 italic">
          Sin coincidencias
        </div>
      )}
    </div>,
    document.body
  )

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onFocus={() => {
          updateDropPosition()
          setOpen(true)
          setHighlight(0)
          if (selected && query === displayLabel(selected)) inputRef.current?.select()
        }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0) }}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />
      {selected && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none"
          aria-label="Limpiar"
        >
          ×
        </button>
      )}
      {dropdown}
    </div>
  )
}
