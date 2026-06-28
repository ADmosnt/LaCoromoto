import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getOrdenes, getOrden, getClientes, getGruposClientes, downloadOrdenPDF, anularOrden, confirmarReporteVenta } from '../api'
import OrdenModal from '../components/OrdenModal'
import OrdenEdicionesModal from '../components/OrdenEdicionesModal'
import OrdenesResumenModal from '../components/OrdenesResumenModal'
import ReporteVentaModal from '../components/ReporteVentaModal'
import { HelpTooltip } from '../components/ui/Tooltip'
import StatusBadge, { STATUS_CONFIG } from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function labelMes(key) {
  const [year, month] = key.split('-')
  return `${MESES[parseInt(month, 10) - 1]} ${year}`
}

function groupByMonth(ordenes) {
  const map = {}
  for (const o of ordenes) {
    const key = o.fecha_emision.slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(o)
  }
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

// Avisos del panel de detalle según el estado. Los colores NO se hardcodean:
// se derivan de STATUS_CONFIG (la misma fuente de verdad que StatusBadge), así
// el banner y la píldora de estado siempre concuerdan.
const STATUS_NOTICE = {
  anulada: 'Orden anulada. El stock fue revertido al almacén.',
  pendiente: 'Reporte de venta registrado — pendiente de confirmación.',
  parcial: 'Reportada y confirmada parcialmente. Aún queda stock en consignación por reportar.',
  confirmado: 'Venta confirmada. Stock descontado.',
}

function StatusNotice({ status }) {
  const msg = STATUS_NOTICE[status]
  if (!msg) return null
  const cfg = STATUS_CONFIG[status]
  return (
    <div
      className="mb-2 text-xs rounded px-2 py-1 border"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: `${cfg.text}33` }}
    >
      {msg}
    </div>
  )
}


function OrdenDetailPanel({ ordenId, refreshKey, onAnulada, onReporteCreated, onEditar, onVerEdiciones }) {
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [reporteModalOpen, setReporteModalOpen] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const fetchDetail = () => {
    setDetail(null)
    setLoadError(false)
    getOrden(ordenId).then((r) => setDetail(r.data)).catch(() => setLoadError(true))
  }

  useEffect(() => { fetchDetail() }, [ordenId, refreshKey])

  const handlePDF = async () => {
    try {
      const r = await downloadOrdenPDF(ordenId)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `orden_${detail.numero_orden}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar el PDF')
    }
  }

  const handleAnular = async () => {
    if (!confirm(`¿Anular la orden #${detail.numero_orden}? Esta acción revertirá el stock en consignación.`)) return
    try {
      await anularOrden(ordenId)
      toast.success(`Orden #${detail.numero_orden} anulada`)
      onAnulada()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al anular la orden')
    }
  }

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar la venta? Esto descontará el stock en consignación.')) return
    setConfirmando(true)
    try {
      await confirmarReporteVenta(detail.reporte_id)
      toast.success('Venta confirmada. Stock descontado.')
      fetchDetail()
      onReporteCreated()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al confirmar la venta')
    } finally {
      setConfirmando(false)
    }
  }

  if (loadError) return <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-red-500">Error al cargar el detalle</div>
  if (!detail) return <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-gray-400">Cargando...</div>

  const { status } = detail
  const isActiva = status === 'activa'
  const isPendiente = status === 'pendiente'
  const isParcial = status === 'parcial'
  const puedeEditar = Boolean(detail.puede_editar)
  const edicionesCount = detail.ediciones_count ?? 0

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      {edicionesCount > 0 && (
        <div className="mb-2 flex items-center">
          <button
            onClick={() => onVerEdiciones(detail)}
            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 rounded px-2 py-1 font-medium inline-flex items-center gap-1"
          >
            <span>✎</span>
            <span>Editada {edicionesCount > 1 ? `(${edicionesCount} cambios)` : '(1 cambio)'} — ver historial</span>
          </button>
        </div>
      )}
      <StatusNotice status={status} />
      <div className="overflow-x-auto mb-3">
        {(() => {
          const devueltoMap = {}
          for (const dev of detail.devoluciones ?? []) {
            for (const det of dev.detalles ?? []) {
              devueltoMap[det.producto_id] = (devueltoMap[det.producto_id] || 0) + det.cantidad_unidades
            }
          }
          const hayDevolucion = Object.keys(devueltoMap).length > 0

          const reportadoMap = {}
          for (const rep of detail.reportes ?? []) {
            if (rep.status === 'pendiente' || rep.status === 'confirmado') {
              for (const det of rep.detalles ?? []) {
                reportadoMap[det.producto_id] = (reportadoMap[det.producto_id] || 0) + det.cantidad_unidades
              }
            }
          }
          const hayReporte = Object.keys(reportadoMap).length > 0

          return (
            <table className="w-full text-xs">
              <thead className="bg-gray-200 text-gray-600 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-center">Despachado</th>
                  {hayDevolucion && <th className="px-3 py-2 text-center text-orange-700">Devuelto</th>}
                  {hayDevolucion && <th className="px-3 py-2 text-center">Neto</th>}
                  {hayReporte && <th className="px-3 py-2 text-center text-brand-700">Reportado</th>}
                  {hayReporte && <th className="px-3 py-2 text-center">Pendiente</th>}
                  <th className="px-3 py-2 text-right">Precio/Bulto</th>
                  <th className="px-3 py-2 text-right">Total USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detail.detalles?.map((d) => {
                  const upb = d.unidades_por_bulto || 1
                  const precioBulto = Number(d.precio_usd_momento) * upb
                  const devuelto = devueltoMap[d.producto_id] || 0
                  const neto = d.cantidad_unidades - devuelto
                  const reportado = reportadoMap[d.producto_id] || 0
                  const pendienteReporte = d.cantidad_unidades - reportado
                  return (
                    <tr key={d.id} className="hover:bg-gray-100">
                      <td className="px-3 py-2 font-mono">{d.codigo}</td>
                      <td className="px-3 py-2">{d.descripcion}</td>
                      <td className="px-3 py-2 text-center text-gray-500">
                        {Math.floor(d.cantidad_unidades / upb)}B+{d.cantidad_unidades % upb}u
                      </td>
                      {hayDevolucion && (
                        <td className="px-3 py-2 text-center text-orange-600">
                          {devuelto > 0 ? `-${devuelto} uds` : '—'}
                        </td>
                      )}
                      {hayDevolucion && (
                        <td className="px-3 py-2 text-center font-medium">
                          {Math.floor(neto / upb)}B+{neto % upb}u
                        </td>
                      )}
                      {hayReporte && (
                        <td className="px-3 py-2 text-center text-brand-600">
                          {reportado > 0 ? `${reportado} uds` : '—'}
                        </td>
                      )}
                      {hayReporte && (
                        <td className="px-3 py-2 text-center font-medium">
                          {pendienteReporte > 0 ? `${pendienteReporte} uds` : '—'}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right">${precioBulto.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">${Number(d.total_usd).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        })()}
      </div>
      {detail.devoluciones?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Devoluciones vinculadas</p>
          {detail.devoluciones.map((dev) => (
            <div key={dev.id} className="text-xs bg-orange-50 border border-orange-200 rounded px-3 py-2 mb-1">
              <span className="font-medium">{dev.fecha}</span>
              {dev.nota && <span className="ml-2 italic text-gray-600">"{dev.nota}"</span>}
              <ul className="mt-1 ml-2 text-gray-700 space-y-0.5">
                {dev.detalles?.map((det) => (
                  <li key={det.id}>{det.descripcion}: <strong>{det.cantidad_unidades} uds</strong> devueltas</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={handlePDF}>
            Descargar PDF
          </Button>
          {puedeEditar && (
            <span className="inline-flex items-center gap-1">
              <Button variant="purple" size="sm" onClick={() => onEditar(detail)}>
                Editar Orden
              </Button>
              <HelpTooltip text="Edita los productos, cantidades, precios, fecha o nota. Se registrará un historial de cambios visible para auditoría." side="top" />
            </span>
          )}
          {(isActiva || isParcial) && (
            <span className="inline-flex items-center gap-1">
              <Button variant="primary" size="sm" onClick={() => setReporteModalOpen(true)}>
                Registrar Reporte de Venta
              </Button>
              <HelpTooltip text="Registra cuántas unidades fueron vendidas y cobradas. Puedes registrar varios reportes por partes hasta cubrir todo lo despachado. Cada uno queda pendiente de confirmación hasta que el administrador lo apruebe." side="top" />
            </span>
          )}
          {isPendiente && (
            <span className="inline-flex items-center gap-1">
              <Button variant="primary" size="sm" onClick={handleConfirmar} disabled={confirmando}>
                {confirmando ? 'Confirmando...' : 'Confirmar Venta'}
              </Button>
              <HelpTooltip text="Confirma el reporte de venta pendiente. Esto descuenta permanentemente las unidades vendidas del stock en consignación del cliente." side="top" />
            </span>
          )}
          {isActiva && (
            <span className="inline-flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={handleAnular}>
                Anular Orden
              </Button>
              <HelpTooltip text="Cancela esta orden y devuelve todas las unidades despachadas al inventario central. Esta acción no se puede deshacer." side="top" />
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 text-right">
          <span>Tasa: Bs. {Number(detail.tasa_valor).toFixed(4)}</span>
          <span className="ml-3 font-semibold text-gray-700">Total Bs. {Number(detail.total_bs).toFixed(2)}</span>
          {detail.nota && <span className="ml-3 italic">"{detail.nota}"</span>}
        </div>
      </div>

      <ReporteVentaModal
        open={reporteModalOpen}
        onClose={() => setReporteModalOpen(false)}
        onSaved={() => { fetchDetail(); onReporteCreated() }}
        orden={detail}
      />
    </div>
  )
}

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

  const meses = groupByMonth(ordenes)
  const grandTotal = ordenes
    .filter((o) => o.status !== 'anulada')
    .reduce((s, o) => s + Number(o.total_usd), 0)

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
              {items.map((o) => (
                <div key={o.id} className="border-b border-gray-100 last:border-b-0">
                  <div
                    className={`flex items-center gap-2 sm:gap-3 px-4 py-3 cursor-pointer hover:bg-brand-50 select-none ${o.status === 'anulada' ? 'opacity-60' : ''}`}
                    onClick={() => toggle(o.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(o.id)}
                      disabled={o.status === 'anulada'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(o.id)}
                      className="flex-shrink-0 w-4 h-4 accent-blue-600 disabled:opacity-30"
                      title={o.status === 'anulada' ? 'No se pueden incluir órdenes anuladas' : 'Seleccionar para resumen general'}
                    />
                    <span className="text-gray-400 text-xs w-3 flex-shrink-0">
                      {expanded === o.id ? '▼' : '▶'}
                    </span>
                    <span className="font-mono text-xs text-brand-600 w-24 flex-shrink-0">{o.numero_orden}</span>
                    <span className="flex-1 font-medium text-sm truncate min-w-0">{o.cliente}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">{o.fecha_emision}</span>
                    {o.ediciones_count > 0 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex-shrink-0"
                        title={`${o.ediciones_count} edición${o.ediciones_count !== 1 ? 'es' : ''}`}
                      >
                        ✎
                      </span>
                    )}
                    <StatusBadge status={o.status} />
                    <span className={`text-sm font-medium flex-shrink-0 ${o.status === 'anulada' ? 'line-through text-gray-400' : ''}`}>
                      ${Number(o.total_usd).toFixed(2)}
                    </span>
                  </div>
                  {expanded === o.id && (
                    <OrdenDetailPanel
                      ordenId={o.id}
                      refreshKey={panelRefreshKey}
                      onAnulada={() => { setExpanded(null); load() }}
                      onReporteCreated={() => load()}
                      onEditar={(d) => setEditOrdenId(d.id)}
                      onVerEdiciones={(d) => setEdicionesTarget({ id: d.id, numero: d.numero_orden })}
                    />
                  )}
                </div>
              ))}
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
