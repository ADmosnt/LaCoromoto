import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrdenes, getClientes } from '../api'
import PageHeader from '../components/PageHeader'
import Alert from '../components/Alert'

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
  anulada: 'bg-red-100 text-red-700',
}

export default function Historial() {
  const [ordenes, setOrdenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
  }, [])

  useEffect(() => {
    getOrdenes({
      cliente_id: clienteId || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    })
      .then((r) => setOrdenes(r.data))
      .catch(() => setError('Error al cargar el historial'))
  }, [clienteId, fechaDesde, fechaHasta])

  const grupos = groupByMonth(ordenes)

  const grandTotal = ordenes
    .filter((o) => o.status !== 'anulada')
    .reduce((s, o) => s + Number(o.total_usd), 0)

  return (
    <div>
      <PageHeader title="Historial de Órdenes" />
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">N° Orden</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-center">Estado</th>
                    <th className="px-4 py-2 text-right">Tasa</th>
                    <th className="px-4 py-2 text-right">Total USD</th>
                    <th className="px-4 py-2 text-right">Total Bs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((o) => (
                    <tr key={o.id} className={`hover:bg-gray-50 ${o.status === 'anulada' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2">
                        <Link to={`/ordenes/${o.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                          {o.numero_orden}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{o.cliente}</td>
                      <td className="px-4 py-2">{o.fecha_emision}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">{Number(o.tasa_valor).toFixed(4)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${o.status === 'anulada' ? 'line-through text-gray-400' : ''}`}>
                        ${Number(o.total_usd).toFixed(2)}
                      </td>
                      <td className={`px-4 py-2 text-right ${o.status === 'anulada' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                        Bs. {Number(o.total_bs).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  )
}
