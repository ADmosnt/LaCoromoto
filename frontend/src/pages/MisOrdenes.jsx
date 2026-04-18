import { useEffect, useState } from 'react'
import { getOrdenes, getOrden, downloadOrdenPDF, confirmarReporteVenta } from '../api'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'
import ReporteVentaModal from '../components/ReporteVentaModal'

const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  anulada: 'bg-red-100 text-red-700',
}
const statusLabel = { activa: 'Activa', pendiente: 'Pendiente', confirmado: 'Confirmado', anulada: 'Anulada' }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function groupByMonth(ordenes) {
  const map = {}
  for (const o of ordenes) {
    const key = o.fecha_emision.slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(o)
  }
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

function labelMes(key) {
  const [year, month] = key.split('-')
  return `${MESES[parseInt(month, 10) - 1]} ${year}`
}

function PanelDetalle({ ordenId, onRefresh }) {
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState('')
  const [reporteOpen, setReporteOpen] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    setDetail(null); setErr('')
    getOrden(ordenId).then((r) => setDetail(r.data)).catch(() => setErr('Error al cargar detalle'))
  }, [ordenId])

  const handlePDF = async () => {
    try {
      const r = await downloadOrdenPDF(ordenId)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `orden_${detail.numero_orden}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { setErr('Error al generar PDF') }
  }

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar la venta?')) return
    setConfirmando(true)
    try {
      await confirmarReporteVenta(detail.reporte_id)
      onRefresh()
    } catch (e) {
      setErr(e.response?.data?.error ?? 'Error al confirmar')
    } finally { setConfirmando(false) }
  }

  if (err) return <div className="bg-gray-50 border-t px-4 py-3 text-sm text-red-500">{err}</div>
  if (!detail) return <div className="bg-gray-50 border-t px-4 py-3 text-sm text-gray-400">Cargando...</div>

  const isActiva = detail.status === 'activa'
  const isPendiente = detail.status === 'pendiente'

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      {isPendiente && (
        <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
          Reporte enviado — pendiente de confirmación.
        </div>
      )}
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-center">Cant.</th>
              <th className="px-3 py-2 text-right">Precio/Bulto</th>
              <th className="px-3 py-2 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {detail.detalles?.map((d) => {
              const upb = d.unidades_por_bulto || 1
              return (
                <tr key={d.id}>
                  <td className="px-3 py-2">{d.descripcion}</td>
                  <td className="px-3 py-2 text-center">{d.cantidad_unidades} uds</td>
                  <td className="px-3 py-2 text-right">${(Number(d.precio_usd_momento) * upb).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">${Number(d.total_usd).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={handlePDF} className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded">
          Descargar PDF
        </button>
        {isActiva && (
          <button onClick={() => setReporteOpen(true)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">
            Registrar Reporte de Venta
          </button>
        )}
        {isPendiente && (
          <button onClick={handleConfirmar} disabled={confirmando} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50">
            {confirmando ? 'Confirmando...' : 'Confirmar Venta'}
          </button>
        )}
      </div>
      <ReporteVentaModal
        open={reporteOpen}
        onClose={() => setReporteOpen(false)}
        onSaved={() => { onRefresh(); setReporteOpen(false) }}
        orden={detail}
      />
    </div>
  )
}

export default function MisOrdenes() {
  const { user } = useAuth()
  const [ordenes, setOrdenes] = useState([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = () =>
    getOrdenes({ cliente_id: user.cliente_id })
      .then((r) => setOrdenes(r.data))
      .catch(() => setError('Error al cargar órdenes'))

  useEffect(() => { if (user?.cliente_id) load() }, [user])

  const toggle = (id) => setExpanded((p) => (p === id ? null : id))
  const grupos = groupByMonth(ordenes)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Mis Órdenes</h2>
      <Alert type="error" message={error} />

      {grupos.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">No hay órdenes registradas</div>
      )}

      {grupos.map(([key, items]) => (
        <div key={key} className="mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide px-1 mb-1">{labelMes(key)}</h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {items.map((o) => (
              <div key={o.id} className="border-b border-gray-100 last:border-b-0">
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none ${o.status === 'anulada' ? 'opacity-60' : ''}`}
                  onClick={() => toggle(o.id)}
                >
                  <span className="text-gray-400 text-xs w-3 flex-shrink-0">{expanded === o.id ? '▼' : '▶'}</span>
                  <span className="font-mono text-xs text-blue-600 w-24 flex-shrink-0">{o.numero_orden}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{o.fecha_emision}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[o.status] ?? o.status}
                  </span>
                  <span className="ml-auto text-sm font-medium">${Number(o.total_usd).toFixed(2)}</span>
                </div>
                {expanded === o.id && (
                  <PanelDetalle ordenId={o.id} onRefresh={() => load()} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
