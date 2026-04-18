import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReportesVenta, confirmarReporteVenta, getClientes } from '../api'
import Alert from '../components/Alert'

const statusBadge = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-green-100 text-green-700',
}

export default function ReportesVenta() {
  const [reportes, setReportes] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    getReportesVenta({ cliente_id: clienteId || undefined, status: status || undefined })
      .then((r) => setReportes(r.data))
      .catch(() => setError('Error al cargar reportes'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId, status])

  const handleConfirmar = async (id) => {
    if (!confirm('¿Confirmar este reporte? Se descontará del stock en consignación.')) return
    try {
      await confirmarReporteVenta(id)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al confirmar')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Reportes de Venta</h2>
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-3">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-right">Total USD</th>
                <th className="px-4 py-3 text-right">Total Bs.</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportes.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">#{r.id}</td>
                  <td className="px-4 py-3 font-medium">{r.cliente}</td>
                  <td className="px-4 py-3">{r.fecha}</td>
                  <td className="px-4 py-3 text-right">${Number(r.total_usd).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">Bs. {Number(r.total_bs).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <Link to={`/reportes-venta/${r.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                    {r.status === 'pendiente' && (
                      <button onClick={() => handleConfirmar(r.id)} className="text-green-600 hover:underline text-xs">
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {reportes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay reportes registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
