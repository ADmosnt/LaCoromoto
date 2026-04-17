import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrdenes, downloadOrdenPDF, getClientes } from '../api'
import PageHeader from '../components/PageHeader'
import Alert from '../components/Alert'

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [error, setError] = useState('')

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

  const handlePDF = async (id, numero) => {
    try {
      const r = await downloadOrdenPDF(id)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `orden_${numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al generar el PDF')
    }
  }

  return (
    <div>
      <PageHeader title="Órdenes de Despacho" action={{ to: '/ordenes/nueva', label: '+ Nueva orden' }} />
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => { setClienteId(''); setFechaDesde(''); setFechaHasta('') }}
            className="text-sm text-gray-500 hover:text-gray-700">Limpiar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">N° Orden</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-right">Tasa BCV</th>
                <th className="px-4 py-3 text-right">Total USD</th>
                <th className="px-4 py-3 text-right">Total Bs.</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ordenes.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/ordenes/${o.id}`} className="text-blue-600 hover:underline font-mono text-xs">{o.numero_orden}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{o.cliente}</td>
                  <td className="px-4 py-3">{o.fecha_emision}</td>
                  <td className="px-4 py-3 text-right">{Number(o.tasa_valor).toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-medium">${Number(o.total_usd).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">Bs. {Number(o.total_bs).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <Link to={`/ordenes/${o.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                    <button onClick={() => handlePDF(o.id, o.numero_orden)} className="text-green-600 hover:underline text-xs">PDF</button>
                  </td>
                </tr>
              ))}
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay órdenes registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
