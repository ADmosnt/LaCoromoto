import { useEffect, useState } from 'react'
import { getOrdenes, getOrden, getClientes, downloadOrdenPDF, anularOrden, confirmarReporteVenta } from '../api'
import Alert from '../components/Alert'
import OrdenModal from '../components/OrdenModal'
import ReporteVentaModal from '../components/ReporteVentaModal'

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

const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  anulada: 'bg-red-100 text-red-700',
}

const statusLabel = {
  activa: 'Activa',
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  anulada: 'Anulada',
}

function OrdenDetailPanel({ ordenId, onAnulada, onReporteCreated }) {
  const [detail, setDetail] = useState(null)
  const [panelError, setPanelError] = useState('')
  const [reporteModalOpen, setReporteModalOpen] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const fetchDetail = () => {
    setDetail(null)
    setPanelError('')
    getOrden(ordenId).then((r) => setDetail(r.data)).catch(() => setPanelError('Error al cargar el detalle'))
  }

  useEffect(() => { fetchDetail() }, [ordenId])

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
      setPanelError('Error al generar el PDF')
    }
  }

  const handleAnular = async () => {
    if (!confirm(`¿Anular la orden #${detail.numero_orden}? Esta acción revertirá el stock en consignación.`)) return
    try {
      await anularOrden(ordenId)
      onAnulada()
    } catch (err) {
      setPanelError(err.response?.data?.error ?? 'Error al anular')
    }
  }

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar la venta? Esto descontará el stock en consignación.')) return
    setConfirmando(true)
    try {
      await confirmarReporteVenta(detail.reporte_id)
      onReporteCreated()
    } catch (err) {
      setPanelError(err.response?.data?.error ?? 'Error al confirmar')
    } finally {
      setConfirmando(false)
    }
  }

  if (panelError) return <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-red-500">{panelError}</div>
  if (!detail) return <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-gray-400">Cargando...</div>

  const { status } = detail
  const isAnulada = status === 'anulada'
  const isActiva = status === 'activa'
  const isPendiente = status === 'pendiente'
  const isConfirmado = status === 'confirmado'

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      {isAnulada && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          Orden anulada. El stock fue revertido al almacén.
        </div>
      )}
      {isPendiente && (
        <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
          Reporte de venta registrado — pendiente de confirmación.
        </div>
      )}
      {isConfirmado && (
        <div className="mb-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          Venta confirmada. Stock descontado.
        </div>
      )}
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-center">Cant.</th>
              <th className="px-3 py-2 text-center">Bultos</th>
              <th className="px-3 py-2 text-right">Precio/Bulto</th>
              <th className="px-3 py-2 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {detail.detalles?.map((d) => {
              const upb = d.unidades_por_bulto || 1
              const precioBulto = Number(d.precio_usd_momento) * upb
              return (
                <tr key={d.id} className="hover:bg-gray-100">
                  <td className="px-3 py-2 font-mono">{d.codigo}</td>
                  <td className="px-3 py-2">{d.descripcion}</td>
                  <td className="px-3 py-2 text-center">{d.cantidad_unidades}</td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    {Math.floor(d.cantidad_unidades / upb)}B + {d.cantidad_unidades % upb}u
                  </td>
                  <td className="px-3 py-2 text-right">${precioBulto.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">${Number(d.total_usd).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handlePDF}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded"
          >
            Descargar PDF
          </button>
          {isActiva && (
            <button
              onClick={() => setReporteModalOpen(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded"
            >
              Registrar Reporte de Venta
            </button>
          )}
          {isPendiente && (
            <button
              onClick={handleConfirmar}
              disabled={confirmando}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
            >
              {confirmando ? 'Confirmando...' : 'Confirmar Venta'}
            </button>
          )}
          {isActiva && (
            <button
              onClick={handleAnular}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded"
            >
              Anular Orden
            </button>
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
        onSaved={() => { onReporteCreated(); setReporteModalOpen(false) }}
        orden={detail}
      />
    </div>
  )
}

const sel = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = () =>
    getOrdenes({
      cliente_id: clienteId || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    })
      .then((r) => setOrdenes(r.data))
      .catch(() => setError('Error al cargar órdenes'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId, fechaDesde, fechaHasta])

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))

  const grupos = groupByMonth(ordenes)
  const grandTotal = ordenes
    .filter((o) => o.status !== 'anulada')
    .reduce((s, o) => s + Number(o.total_usd), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Órdenes de Despacho</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Nueva orden
        </button>
      </div>

      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={sel}>
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={sel} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={sel} />
        </div>
        <button
          onClick={() => { setClienteId(''); setFechaDesde(''); setFechaHasta('') }}
          className="text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Limpiar
        </button>
      </div>

      {grupos.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">No hay órdenes registradas</div>
      )}

      {grupos.map(([key, items]) => {
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
                    className={`flex items-center gap-2 sm:gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none ${o.status === 'anulada' ? 'opacity-60' : ''}`}
                    onClick={() => toggle(o.id)}
                  >
                    <span className="text-gray-400 text-xs w-3 flex-shrink-0">
                      {expanded === o.id ? '▼' : '▶'}
                    </span>
                    <span className="font-mono text-xs text-blue-600 w-24 flex-shrink-0">{o.numero_orden}</span>
                    <span className="flex-1 font-medium text-sm truncate min-w-0">{o.cliente}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">{o.fecha_emision}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[o.status] ?? o.status}
                    </span>
                    <span className={`text-sm font-medium flex-shrink-0 ${o.status === 'anulada' ? 'line-through text-gray-400' : ''}`}>
                      ${Number(o.total_usd).toFixed(2)}
                    </span>
                  </div>
                  {expanded === o.id && (
                    <OrdenDetailPanel
                      ordenId={o.id}
                      onAnulada={() => { setExpanded(null); load() }}
                      onReporteCreated={() => load()}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {grandTotal > 0 && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-blue-600 uppercase font-medium">Total acumulado (órdenes activas)</p>
            <p className="text-2xl font-bold text-blue-800">${grandTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      <OrdenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
