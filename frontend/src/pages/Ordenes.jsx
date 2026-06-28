import { useEffect, useMemo, useState, Fragment } from 'react'
import { toast } from 'sonner'
import { getOrdenes, getClientes, getGruposClientes } from '../api'
import OrdenModal from '../components/OrdenModal'
import OrdenEdicionesModal from '../components/OrdenEdicionesModal'
import OrdenesResumenModal from '../components/OrdenesResumenModal'
import OrdenDetailPanel from '../components/OrdenDetailPanel'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import { labelMes, groupByMonth } from '../lib/fechas'

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [modo, setModo] = useState('cliente') // 'cliente' | 'grupo'
  const [clienteId, setClienteId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [panelRefreshKey, setPanelRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOrdenId, setEditOrdenId] = useState(null)
  const [edicionesTarget, setEdicionesTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [resumenOpen, setResumenOpen] = useState(false)

  const load = () =>
    getOrdenes({
      cliente_id: modo === 'cliente' ? (clienteId || undefined) : undefined,
      grupo_id: modo === 'grupo' ? (grupoId || undefined) : undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    })
      .then((r) => setOrdenes(r.data))
      .catch(() => toast.error('Error al cargar órdenes'))

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data)).catch(() => {})
    getGruposClientes().then((r) => setGrupos(r.data)).catch(() => {})
  }, [])
  useEffect(() => { load(); setSelectedIds(new Set()) }, [modo, clienteId, grupoId, fechaDesde, fechaHasta])

  const cambiarModo = (m) => {
    if (m === modo) return
    setModo(m)
    setClienteId('')
    setGrupoId('')
  }

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  // Datos derivados memoizados: solo se recalculan cuando cambia `ordenes`,
  // no en cada clic de checkbox / expand de fila.
  const meses = useMemo(() => groupByMonth(ordenes), [ordenes])
  const grandTotal = useMemo(
    () => ordenes.filter((o) => o.status !== 'anulada').reduce((s, o) => s + Number(o.total_usd), 0),
    [ordenes],
  )

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Filtrar por</label>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => cambiarModo('cliente')}
              className={`px-3 py-2 font-medium ${modo === 'cliente' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => cambiarModo('grupo')}
              className={`px-3 py-2 font-medium border-l border-gray-300 ${modo === 'grupo' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Grupo
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{modo === 'cliente' ? 'Cliente' : 'Grupo'}</label>
          {modo === 'cliente' ? (
            <Select
              nullable
              noneLabel="Todos"
              value={clienteId}
              onChange={setClienteId}
              options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            />
          ) : (
            <Select
              nullable
              noneLabel="Todos"
              value={grupoId}
              onChange={setGrupoId}
              options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
            />
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <button
          onClick={() => { setClienteId(''); setGrupoId(''); setFechaDesde(''); setFechaHasta('') }}
          className="text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Limpiar
        </button>
        <Button onClick={() => setModalOpen(true)} className="ml-auto">+ Nueva orden</Button>
      </div>

      {meses.length === 0 && (
        <EmptyState message="No hay órdenes registradas" />
      )}

      {meses.map(([key, items]) => {
        const totalMes = items
          .filter((o) => o.status !== 'anulada')
          .reduce((s, o) => s + Number(o.total_usd), 0)

        return (
          <div key={key} className="mb-4">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{labelMes(key)}</h3>
              <span className="text-sm text-gray-500">
                Subtotal: <span className="font-semibold text-gray-700">${totalMes.toFixed(2)}</span>
              </span>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table borderless>
                <Table.Body>
                  {items.map((o) => (
                    <Fragment key={o.id}>
                      <Table.Row
                        onClick={() => toggle(o.id)}
                        className={`hover:bg-brand-50 ${o.status === 'anulada' ? 'opacity-60' : ''}`}
                      >
                        <Table.Td className="w-px pr-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(o.id)}
                            disabled={o.status === 'anulada'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(o.id)}
                            className="w-4 h-4 accent-brand-600 align-middle disabled:opacity-30"
                            title={o.status === 'anulada' ? 'No se pueden incluir órdenes anuladas' : 'Seleccionar para resumen general'}
                          />
                        </Table.Td>
                        <Table.Td className="w-px px-1 text-gray-400 text-xs">
                          {expanded === o.id ? '▼' : '▶'}
                        </Table.Td>
                        <Table.Td className="w-px whitespace-nowrap font-mono text-xs text-brand-600">
                          {o.numero_orden}
                        </Table.Td>
                        <Table.Td className="w-full max-w-0">
                          <span className="block truncate font-medium text-sm">{o.cliente}</span>
                        </Table.Td>
                        <Table.Td className="w-px whitespace-nowrap text-xs text-gray-500 hidden sm:table-cell">
                          {o.fecha_emision}
                        </Table.Td>
                        <Table.Td className="w-px px-1 text-center">
                          {o.ediciones_count > 0 && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"
                              title={`${o.ediciones_count} edición${o.ediciones_count !== 1 ? 'es' : ''}`}
                            >
                              ✎
                            </span>
                          )}
                        </Table.Td>
                        <Table.Td className="w-px">
                          <StatusBadge status={o.status} />
                        </Table.Td>
                        <Table.Td
                          align="right"
                          className={`w-px whitespace-nowrap font-medium text-sm ${o.status === 'anulada' ? 'line-through text-gray-400' : ''}`}
                        >
                          ${Number(o.total_usd).toFixed(2)}
                        </Table.Td>
                      </Table.Row>
                      {expanded === o.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <OrdenDetailPanel
                              ordenId={o.id}
                              refreshKey={panelRefreshKey}
                              onAnulada={() => { setExpanded(null); load() }}
                              onReporteCreated={() => load()}
                              onEditar={(d) => setEditOrdenId(d.id)}
                              onVerEdiciones={(d) => setEdicionesTarget({ id: d.id, numero: d.numero_orden })}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
        )
      })}

      {grandTotal > 0 && (
        <div className="mt-2 bg-brand-50 border border-brand-200 rounded-lg p-4 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-brand-600 uppercase font-medium">Total acumulado (órdenes activas)</p>
            <p className="text-2xl font-bold text-brand-800">${grandTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-full shadow-lg px-5 py-3 flex items-center gap-4">
          <span className="text-sm">
            <strong>{selectedIds.size}</strong> orden{selectedIds.size !== 1 ? 'es' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setResumenOpen(true)}
            className="text-sm bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-full font-medium"
          >
            Generar resumen general
          </button>
          <button
            onClick={clearSelection}
            className="text-sm text-gray-300 hover:text-white"
          >
            Limpiar
          </button>
        </div>
      )}

      <OrdenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      <OrdenModal
        open={editOrdenId != null}
        onClose={() => setEditOrdenId(null)}
        onSaved={() => { load(); setPanelRefreshKey((k) => k + 1) }}
        ordenId={editOrdenId}
      />

      <OrdenEdicionesModal
        open={edicionesTarget != null}
        onClose={() => setEdicionesTarget(null)}
        ordenId={edicionesTarget?.id}
        numeroOrden={edicionesTarget?.numero}
      />

      <OrdenesResumenModal
        open={resumenOpen}
        onClose={() => setResumenOpen(false)}
        ordenIds={Array.from(selectedIds)}
      />
    </div>
  )
}
